/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Subscribable as XStateSubscribable } from 'xstate';
import { useEffect, useRef, useState } from 'react';
import {
  BehaviorSubject,
  Observable,
  OperatorFunction,
  PartialObserver,
  Subscribable,
  Unsubscribable,
} from 'rxjs';
import { share, switchMap, tap } from 'rxjs/operators';

export const useLatest = <Value>(value: Value) => {
  const valueRef = useRef(value);
  valueRef.current = value;
  return valueRef;
};

export const useObservable = <
  OutputValue,
  OutputObservable extends Observable<OutputValue>,
  InputValues extends Readonly<unknown[]>
>(
  createObservableOnce: (inputValues: Observable<InputValues>) => OutputObservable,
  inputValues: InputValues
) => {
  const [output$, next] = useBehaviorSubject(createObservableOnce, () => inputValues);

  useEffect(() => {
    next(inputValues);
    // `inputValues` can't be statically analyzed
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, inputValues);

  return output$;
};

export const useBehaviorSubject = <
  InputValue,
  OutputValue,
  OutputObservable extends Observable<OutputValue>
>(
  deriveObservableOnce: (input$: Observable<InputValue>) => OutputObservable,
  createInitialValue: () => InputValue
) => {
  const [subject$] = useState(() => new BehaviorSubject<InputValue>(createInitialValue()));
  const [output$] = useState(() => deriveObservableOnce(subject$));
  return [output$, subject$.next.bind(subject$)] as const;
};

export const useObservableState = <State, InitialState>(
  state$: Observable<State>,
  initialState: InitialState | (() => InitialState)
) => {
  const [latestValue, setLatestValue] = useState<State | InitialState>(initialState);
  const [latestError, setLatestError] = useState<unknown>();

  useSubscription(state$, {
    next: setLatestValue,
    error: setLatestError,
  });

  return { latestValue, latestError };
};

type CompatibleSubscribable<TEmitted> = Subscribable<TEmitted> | XStateSubscribable<TEmitted>;

export const useSubscription = <InputValue>(
  input$: CompatibleSubscribable<InputValue>,
  { next, error, complete, unsubscribe }: PartialObserver<InputValue> & { unsubscribe?: () => void }
) => {
  const latestSubscription = useRef<Unsubscribable | undefined>();
  const latestNext = useLatest(next);
  const latestError = useLatest(error);
  const latestComplete = useLatest(complete);
  const latestUnsubscribe = useLatest(unsubscribe);

  useEffect(() => {
    const fixedUnsubscribe = latestUnsubscribe.current;

    const subscription = input$.subscribe({
      next: (value) => {
        return latestNext.current?.(value);
      },
      error: (value) => latestError.current?.(value),
      complete: () => latestComplete.current?.(),
    });

    latestSubscription.current = subscription;

    return () => {
      subscription.unsubscribe();
      fixedUnsubscribe?.();
    };
  }, [input$, latestNext, latestError, latestComplete, latestUnsubscribe]);

  return latestSubscription.current;
};

export const useOperator = <InputValue, OutputValue>(
  input$: Observable<InputValue>,
  operator: OperatorFunction<InputValue, OutputValue>
) => {
  const latestOperator = useLatest(operator);

  return useObservable(
    (inputs$) =>
      inputs$.pipe(switchMap(([currentInput$]) => latestOperator.current(currentInput$))),
    [input$] as const
  );
};

export const tapUnsubscribe =
  (onUnsubscribe: () => void) =>
  <T>(source$: Observable<T>) => {
    return new Observable<T>((subscriber) => {
      const subscription = source$.subscribe({
        next: (value) => subscriber.next(value),
        error: (error) => subscriber.error(error),
        complete: () => subscriber.complete(),
      });

      return () => {
        onUnsubscribe();
        subscription.unsubscribe();
      };
    });
  };

export const createUnsubscriptionAbortSignal = () => {
  const abortController = new AbortController();
  let isAbortable = true;

  const abortOnUnsubscribe =
    <T>() =>
    (observable: Observable<T>) =>
      observable.pipe(
        // avoid aborting failed or completed requests
        tap({
          error: () => {
            isAbortable = false;
          },
          complete: () => {
            isAbortable = false;
          },
        }),
        tapUnsubscribe(() => {
          if (isAbortable) {
            abortController.abort();
          }
        }),
        share()
      );

  return {
    abortSignal: abortController.signal,
    abortOnUnsubscribe,
  };
};
