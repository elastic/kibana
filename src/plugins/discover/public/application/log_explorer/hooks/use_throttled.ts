/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { throttle } from 'lodash';
import { useEffect, useMemo } from 'react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const useThrottled = <Fn extends (...args: any[]) => any>(fn: Fn, delay: number) => {
  const throttledFn = useMemo(() => throttle(fn, delay), [fn, delay]);

  useEffect(() => {
    return () => throttledFn.cancel();
  }, [throttledFn]);

  return throttledFn;
};
