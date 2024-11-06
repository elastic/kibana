/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { FtrProviderContext } from './ftr_provider_context';

const MAX_ATTEMPTS = 10;

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const errMsg = (err: unknown) => (isObj(err) && typeof err.message === 'string' ? err.message : '');

export function RetryOnStaleProvider({ getService }: FtrProviderContext) {
  const log = getService('log');

  async function retryOnStale<T>(fn: () => Promise<T>): Promise<T> {
    let attempt = 0;
    while (true) {
      attempt += 1;
      try {
        return await fn();
      } catch (error) {
        if (errMsg(error).includes('stale element reference')) {
          if (attempt >= MAX_ATTEMPTS) {
            throw new Error(`retryOnStale ran out of attempts after ${attempt} tries`);
          }

          log.warning('stale element exception caught, retrying');
          continue;
        }

        throw error;
      }
    }
  }

  retryOnStale.wrap = <Args extends any[], Result>(fn: (...args: Args) => Promise<Result>) => {
    return async (...args: Args) => {
      return await retryOnStale(async () => {
        return await fn(...args);
      });
    };
  };

  return retryOnStale;
}
