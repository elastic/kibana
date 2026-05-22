/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useState } from 'react';
import useLatest from 'react-use/lib/useLatest';

/**
 * Accepts a callback and returns a function with a stable identity
 * that will always call the latest version of the callback when invoked
 */
export const useStableCallback = <T extends (...args: Parameters<T>) => ReturnType<T>>(fn: T) => {
  const latestFn = useLatest(fn);
  const [stableFn] = useState(() => {
    return ((...args: Parameters<T>) => latestFn.current(...args)) as T;
  });

  return stableFn;
};
