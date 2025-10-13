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
import { isFunction } from 'lodash';

type ChangeHandler<T> = (state: T) => void;
type SetStateFn<T> = Dispatch<SetStateAction<T>>;

export function useControllableState<T>(params: {
  value?: T;
  onChange?: ChangeHandler<T>;
  defaultValue?: T;
}): [T, SetStateFn<T>];
export function useControllableState<T>({
  value,
  onChange,
  defaultValue,
}: {
  value?: T;
  onChange?: ChangeHandler<T | undefined>;
  defaultValue?: undefined;
}): [T | undefined, SetStateFn<T | undefined>] {
  const [internalState, setInternalState, onChangeRef] = useInternalState({
    initialValue: defaultValue,
    onChange,
  });
  const isControlled = value !== undefined && !!onChange;
  const selectedValue = isControlled ? value : internalState;

  const setValue = useCallback<SetStateFn<T | undefined>>(
    (nextValue) => {
      if (onChangeRef.current) {
        const newValue = isFunction(nextValue) ? nextValue(value) : nextValue;
        onChangeRef.current(newValue);
      } else {
        setInternalState(nextValue);
      }
    },
    [value, onChangeRef, setInternalState]
  );

  return [selectedValue, setValue] as const;
}

function useInternalState<T>({
  initialValue,
  onChange,
}: {
  initialValue?: T;
  onChange?: ChangeHandler<T | undefined>;
}) {
  const [value, setValue] = useState(initialValue);
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
}
