/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useState, useMemo, useEffect, useRef } from 'react';
import { debounce } from 'lodash';

const DEFAULT_TIMEOUT = 256;
/**
 * Debounces value changes and updates inputValue on root state changes if no debounced changes
 * are in flight because the user is currently modifying the value.
 *
 * * allowFalsyValue: update upstream with all falsy values but null or undefined
 * * wait: debounce timeout
 */

export const useDebouncedValue = <T>(
  {
    onChange,
    value,
    defaultValue,
  }: {
    onChange: (val: T) => void;
    value: T;
    defaultValue?: T;
  },
  { allowFalsyValue, wait = DEFAULT_TIMEOUT }: { allowFalsyValue?: boolean; wait?: number } = {
    wait: DEFAULT_TIMEOUT,
  }
) => {
  const [inputValue, setInputValue] = useState(value);
  const unflushedChanges = useRef(false);
  const shouldUpdateWithFalsyValue = Boolean(allowFalsyValue);

  // Save the initial value
  const initialValue = useRef(defaultValue ?? value);

  const flushChangesTimeout = useRef<NodeJS.Timeout | undefined>();

  const onChangeDebounced = useMemo(() => {
    const callback = debounce((val: T) => {
      onChange(val);
      // do not reset unflushed flag right away, wait a bit for upstream to pick it up
      flushChangesTimeout.current = setTimeout(() => {
        unflushedChanges.current = false;
      }, wait);
    }, wait);
    return (val: T) => {
      if (flushChangesTimeout.current) {
        clearTimeout(flushChangesTimeout.current);
      }
      unflushedChanges.current = true;
      callback(val);
    };
  }, [onChange, wait]);

  useEffect(() => {
    if (!unflushedChanges.current && value !== inputValue) {
      setInputValue(value);
    }
  }, [value, inputValue]);

  const handleInputChange = (val: T) => {
    setInputValue(val);
    const valueToUpload = shouldUpdateWithFalsyValue
      ? val ?? initialValue.current
      : val || initialValue.current;
    onChangeDebounced(valueToUpload);
  };

  return { inputValue, handleInputChange, initialValue: initialValue.current };
};
