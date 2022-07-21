/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { debounce } from 'lodash';

/**
 * Uses a debouncer collector behind a debouncing factory to work on a set of functions
 *
 * @template F - function type
 * @param {F} fn - function to debounce
 * @param {number} waitInMs
 * @returns {(key: string) => Function}
 */
export const debounceByKey = <F extends (...args: any) => unknown>(
  fn: F,
  waitInMs: number
): ((key: string) => Function) => {
  const debouncerCollector: Record<string, Function> = {};
  return (key: string) => {
    if (!debouncerCollector[key]) {
      debouncerCollector[key] = debounce(fn, waitInMs, {
        leading: true,
      });
    }
    return debouncerCollector[key];
  };
};
