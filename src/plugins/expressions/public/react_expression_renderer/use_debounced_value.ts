/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { debounce } from 'lodash';
import type { DebouncedFunc } from 'lodash';
import { useCallback, useEffect, useMemo, useState } from 'react';
import useUpdateEffect from 'react-use/lib/useUpdateEffect';

export function useDebouncedValue<T>(value: T, timeout?: number): [T, boolean] {
  const [storedValue, setStoredValue] = useState(value);
  const [isPending, setPending] = useState(false);
  const setValue = useCallback(
    (newValue: T) => {
      setStoredValue(newValue);
      setPending(false);
    },
    [setStoredValue, setPending]
  );
  const setDebouncedValue = useMemo<DebouncedFunc<typeof setValue>>(
    () => (timeout ? debounce(setValue, timeout) : (setValue as DebouncedFunc<typeof setValue>)),
    [setValue, timeout]
  );

  useEffect(() => () => setDebouncedValue.cancel?.(), [setDebouncedValue]);
  useUpdateEffect(() => {
    setPending(true);
    setDebouncedValue(value);

    return () => setDebouncedValue.cancel?.();
  }, [value]);

  return [storedValue, isPending];
}
