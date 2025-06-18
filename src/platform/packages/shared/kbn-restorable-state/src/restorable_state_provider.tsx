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

export interface RestorableStateContext<TState extends object> {
  initialState?: TState;
  onInitialStateChange?: (initialState: TState) => void;
}

export interface RestorableStateProviderApi {
  refreshInitialState: () => void;
}

export const createRestorableStateProvider = <TState extends object>() => {
  const context = createContext<RestorableStateContext<TState>>({
    initialState: undefined,
    onInitialStateChange: undefined,
  });

  const RestorableStateProvider = forwardRef<
    RestorableStateProviderApi,
    PropsWithChildren<RestorableStateContext<TState>>
  >(
    (
      {
        initialState: currentInitialState,
        onInitialStateChange: currentOnInitialStateChange,
        children,
      },
      ref
    ) => {
      // TODO: Might make sense to use a BehaviorSubject instead to stabilize the reference
      const [initialState, setInitialState] = useState(currentInitialState);
      const stableOnInitialStateChange = useLatest((newInitialState: TState) => {
        setInitialState(newInitialState);
        currentOnInitialStateChange?.(newInitialState);
      });
      const [onInitialStateChange] = useState(
        (): typeof stableOnInitialStateChange.current => (newInitialState) => {
          stableOnInitialStateChange.current?.(newInitialState);
        }
      );

      useImperativeHandle(
        ref,
        () => ({ refreshInitialState: () => setInitialState(currentInitialState) }),
        [currentInitialState]
      );

      const value = useMemo(
        () => ({
          initialState,
          onInitialStateChange,
        }),
        [initialState, onInitialStateChange]
      );

      return <context.Provider value={value}>{children}</context.Provider>;
    }
  );

  const withRestorableState = <TProps extends object>(Component: React.ComponentType<TProps>) =>
    forwardRef<RestorableStateProviderApi, TProps & RestorableStateContext<TState>>(
      ({ initialState, onInitialStateChange, ...props }, ref) => (
        <RestorableStateProvider
          ref={ref}
          initialState={initialState}
          onInitialStateChange={onInitialStateChange}
        >
          {/* TODO: Why is `as TProps` necessary here? */}
          <Component {...(props as TProps)} />
        </RestorableStateProvider>
      )
    );

  // TODO: Better typings for all of this, maybe steal more from React?
  const useRestorableState = <TKey extends keyof TState>(
    key: TKey,
    initialValue: TState[TKey] | (() => TState[TKey]),
    shouldIgnoredRestoredValue?: (restoredValue: TState[TKey]) => boolean
  ) => {
    const { initialState, onInitialStateChange } = useContext(context);
    const [value, _setValue] = useState(() => {
      // TODO: What if initialState[key] should initialize to undefined?
      if (initialState?.[key] !== undefined && !shouldIgnoredRestoredValue?.(initialState[key])) {
        return initialState[key];
      }
      if (typeof initialValue === 'function') {
        return (initialValue as () => TState[TKey])();
      }
      return initialValue;
    });
    const stableSetValue = useLatest<Dispatch<SetStateAction<TState[TKey]>>>((newValue) => {
      const nextValue =
        typeof newValue === 'function'
          ? (newValue as (prevValue: TState[TKey]) => TState[TKey])(value)
          : newValue;

      if (nextValue === value) {
        return;
      }

      _setValue(nextValue);
      // TODO: another approach to consider is to call `onInitialStateChange` only on unmount and not on every state change
      // TODO: Why is `as TState` necessary here? Might need to be Partial<TState>
      onInitialStateChange?.({ ...initialState, [key]: nextValue } as TState);
    });
    const [setValue] = useState(
      (): typeof stableSetValue.current => (newValue) => stableSetValue.current(newValue)
    );

    return [value, setValue] as const;
  };

  const useRestorableRef = <TKey extends keyof TState>(key: TKey, initialValue: TState[TKey]) => {
    const { initialState, onInitialStateChange } = useContext(context);
    const valueRef = useRef<TState[TKey]>(
      initialState?.[key] !== undefined ? initialState[key] : initialValue
    );
    const stableOnInitialStateChange = useLatest(() => {
      const nextValue = valueRef.current;
      if (nextValue === initialValue) {
        return;
      }
      onInitialStateChange?.({ ...initialState, [key]: valueRef.current } as TState);
    });

    const [unmount] = useState(
      (): typeof stableOnInitialStateChange.current => () => stableOnInitialStateChange.current()
    );

    useEffect(() => {
      return () => {
        unmount();
      };
    }, [unmount]);

    return valueRef;
  };

  return { withRestorableState, useRestorableState, useRestorableRef };
};
