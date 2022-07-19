/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { debounce } from 'lodash';

export const debounceByKey = <F extends (...args: any) => any>(
  fn: F,
  waitInMs: number
): ((key: string) => F) => {
  const debouncerCollector: Record<string, F> = {};
  return (key: string) => {
    if (!debouncerCollector[key]) {
      debouncerCollector[key] = debounce(fn, waitInMs, {
        leading: true,
      });
    }
    return debouncerCollector[key];
  };
};
