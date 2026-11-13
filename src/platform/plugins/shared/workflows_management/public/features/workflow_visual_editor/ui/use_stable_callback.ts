/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useLayoutEffect, useRef } from 'react';

/**
 * A function with a fixed identity that always runs the latest `callback`. For handlers that are
 * registered once (a click-to-insert target, an editor listener) but must see current props.
 */
export const useStableCallback = <Args extends readonly unknown[], Result>(
  callback: (...args: Args) => Result
): ((...args: Args) => Result) => {
  const latest = useRef(callback);
  useLayoutEffect(() => {
    latest.current = callback;
  });
  return useCallback((...args: Args) => latest.current(...args), []);
};
