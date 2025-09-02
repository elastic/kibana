/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  useCallback,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
  useEffect,
} from 'react';

type ChangeHandler<T> = (state: T) => void;
type SetStateFn<T> = Dispatch<SetStateAction<T>>;

interface UseControllableStateParams<T> {
  prop?: T | undefined;
  defaultProp: T;
  onChange?: ChangeHandler<T>;
}

const useUncontrolledState = <T>({
  defaultProp,
  onChange,
}: Omit<UseControllableStateParams<T>, 'prop'>) => {
  const [value, setValue] = useState(defaultProp);
  const onChangeRef = useRef(onChange);
  const preValue = useRef(value);

  useEffect(() => {
    if (preValue.current !== value) {
      onChangeRef.current?.(value);
      preValue.current = value;
    }
  }, [value]);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  return [value, setValue, onChangeRef] as const;
};

const isFunction = (value: unknown): value is (...args: any[]) => any =>
  typeof value === 'function';

export const useControllableState = <T>({
  prop,
  defaultProp,
  onChange,
}: UseControllableStateParams<T>) => {
  const [uncontrolledProp, setUncontrolledProp, onChangeRef] = useUncontrolledState({
    defaultProp,
    onChange,
  });
  const isControlled = prop !== undefined;
  const value = isControlled ? prop : uncontrolledProp;

  // const setValue = isControlled ? controlledSetter : setUncontrolledProp;
  const setValue = useCallback<SetStateFn<T>>(
    (nextValue) => {
      if (isControlled) {
        const newValue = isFunction(nextValue) ? nextValue(prop) : nextValue;
        onChangeRef.current?.(newValue);
      } else {
        setUncontrolledProp(nextValue);
      }
    },
    [isControlled, prop, onChangeRef, setUncontrolledProp]
  );

  return [value, setValue] as const;
};
