/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { debounce } from 'lodash';

export const debounceAsync = <F extends (...args: any[]) => Promise<any>>(
  fn: F,
  intervalMs: number
) => {
  const debounced = debounce((resolve, reject, ...args) => {
    fn(...args)
      .then(resolve)
      .catch(reject);
  }, intervalMs);

  return (...args: Parameters<F>): ReturnType<F> => {
    return new Promise((resolve, reject) => {
      debounced(resolve, reject, ...args);
    }) as ReturnType<F>;
  };
};
