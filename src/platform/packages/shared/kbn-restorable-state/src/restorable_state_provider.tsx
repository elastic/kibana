/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, {
  useContext,
  useState,
  useRef,
  createContext,
  PropsWithChildren,
  forwardRef,
  useImperativeHandle,
  SetStateAction,
  Dispatch,
  useMemo,
  useEffect,
} from 'react';
import useLatest from 'react-use/lib/useLatest';
import useUnmount from 'react-use/lib/useUnmount';
import { BehaviorSubject, Subject, filter, map } from 'rxjs';

export interface RestorableStateProviderProps<TState extends object> {
  initialState?: Partial<TState>;
  onInitialStateChange?: (initialState: Partial<TState>) => void;
}

export interface RestorableStateProviderApi {
  refreshInitialState: () => void;
}

type RestorableStateContext<TState extends object> = Pick<
  RestorableStateProviderProps<TState>,
  'onInitialStateChange'
> & {
  initialState$: BehaviorSubject<Partial<TState> | undefined>;
  initialStateRefresh$: Subject<Partial<TState> | undefined>;
};

export const createRestorableStateProvider = <TState extends object>() => {
  const context = createContext<RestorableStateContext<TState>>({
    initialState$: new BehaviorSubject<Partial<TState> | undefined>(undefined),
    initialStateRefresh$: new Subject<Partial<TState> | undefined>(),
    onInitialStateChange: undefined,
  });

  const RestorableStateProvider = forwardRef<
    RestorableStateProviderApi,
    PropsWithChildren<RestorableStateProviderProps<TState>>
  >(function RestorableStateProvider(
    {
      initialState: currentInitialState,
      onInitialStateChange: currentOnInitialStateChange,
      children,
    },
    ref
  ) {
    const [initialState$] = useState(() => new BehaviorSubject(currentInitialState));
    const [initialStateRefresh$] = useState(() => new Subject<Partial<TState> | undefined>());
    const onInitialStateChange = useStableFunction((newInitialState: Partial<TState>) => {
      initialState$.next(newInitialState);
      currentOnInitialStateChange?.(newInitialState);
    });

    useImperativeHandle(
      ref,
      () => ({
        refreshInitialState: () => {
          initialState$.next(currentInitialState);
          initialStateRefresh$.next(initialState$.getValue());
        },
      }),
      [currentInitialState, initialState$, initialStateRefresh$]
    );

    const value = useMemo<RestorableStateContext<TState>>(
      () => ({
        initialState$,
        initialStateRefresh$,
        onInitialStateChange,
      }),
      [initialState$, initialStateRefresh$, onInitialStateChange]
    );

    return <context.Provider value={value}>{children}</context.Provider>;
  });

  const withRestorableState = <TProps extends object>(Component: React.ComponentType<TProps>) =>
    forwardRef<RestorableStateProviderApi, TProps & RestorableStateProviderProps<TState>>(
      function RestorableStateProviderHOC({ initialState, onInitialStateChange, ...props }, ref) {
        return (
          <RestorableStateProvider
            ref={ref}
            initialState={initialState}
            onInitialStateChange={onInitialStateChange}
          >
            {/* TODO: Why is `as TProps` necessary here? */}
            <Component {...(props as TProps)} />
          </RestorableStateProvider>
        );
      }
    );

  const useInitialStateRefresh = <TKey extends keyof TState>(
    key: TKey,
    refreshValue: Dispatch<TState[TKey]>
  ) => {
    const { initialStateRefresh$ } = useContext(context);
    const stableRefreshValue = useStableFunction(refreshValue);

    useEffect(() => {
      const subscription = initialStateRefresh$
        .pipe(
          map((initialState) => initialState?.[key]),
          filter((value): value is NonNullable<TState[TKey]> => value !== undefined)
        )
        .subscribe(stableRefreshValue);

      return () => {
        subscription.unsubscribe();
      };
    }, [initialStateRefresh$, key, stableRefreshValue]);
  };

  const useRestorableState = <TKey extends keyof TState>(
    key: TKey,
    initialValue: TState[TKey] | (() => TState[TKey]),
    shouldIgnoredRestoredValue?: (restoredValue: TState[TKey]) => boolean
  ) => {
    const { initialState$, onInitialStateChange } = useContext(context);
    const [value, _setValue] = useState(() => {
      const initialState = initialState$.getValue();

      if (
        initialState &&
        key in initialState &&
        !shouldIgnoredRestoredValue?.(initialState[key] as TState[TKey])
      ) {
        return initialState[key] as TState[TKey];
      }
      if (typeof initialValue === 'function') {
        return (initialValue as () => TState[TKey])();
      }

      return initialValue;
    });

    const setValue = useStableFunction<Dispatch<SetStateAction<TState[TKey]>>>((newValue) => {
      _setValue((prevValue) => {
        const nextValue =
          typeof newValue === 'function'
            ? (newValue as (prevValue: TState[TKey]) => TState[TKey])(prevValue)
            : newValue;

        // TODO: another approach to consider is to call `onInitialStateChange` only on unmount and not on every state change
        onInitialStateChange?.({ ...initialState$.getValue(), [key]: nextValue });

        return nextValue;
      });
    });

    useInitialStateRefresh(key, _setValue);

    return [value, setValue] as const;
  };

  const useRestorableRef = <TKey extends keyof TState>(key: TKey, initialValue: TState[TKey]) => {
    const { initialState$, onInitialStateChange } = useContext(context);
    const initialState = initialState$.getValue();
    const valueRef = useRef<TState[TKey]>(
      initialState?.[key] !== undefined ? (initialState[key] as TState[TKey]) : initialValue
    );

    useUnmount(() => {
      onInitialStateChange?.({ ...initialState$.getValue(), [key]: valueRef.current });
    });

    useInitialStateRefresh(key, (newValue) => {
      valueRef.current = newValue;
    });

    return valueRef;
  };

  return { withRestorableState, useRestorableState, useRestorableRef };
};

const useStableFunction = <T extends (...args: Parameters<T>) => ReturnType<T>>(fn: T) => {
  const lastestFn = useLatest(fn);
  const [stableFn] = useState(() => (...args: Parameters<T>) => {
    return lastestFn.current(...args);
  });

  return stableFn;
};
