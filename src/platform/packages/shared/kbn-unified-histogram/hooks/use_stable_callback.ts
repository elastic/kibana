/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useRef } from 'react';

/**
 * Accepts a callback and returns a function with a stable identity
 * that will always call the latest version of the callback when invoked
 */
export const useStableCallback = <T extends (...args: any[]) => any>(fn: T | undefined) => {
  const ref = useRef(fn);

  useEffect(() => {
    ref.current = fn;
  }, [fn]);

  return useRef((...args: Parameters<T>) => ref.current?.(...args)).current;
};
