/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { retryAsync } from './retry_async';

describe('retry', () => {
  it('retries throwing functions until they succeed', async () => {
    let i = 0;
    await expect(
      retryAsync(
        () => {
          if (i++ < 2) {
            return Promise.reject(new Error('boom'));
          } else {
            return Promise.resolve('done');
          }
        },
        { retryAttempts: 3, retryDelayMs: 1 }
      )
    ).resolves.toEqual('done');
  });

  it('throws if all attempts are exhausted before success', async () => {
    let attempts = 0;
    await expect(() =>
      retryAsync<Error>(
        () => {
          attempts++;
          return Promise.reject(new Error('boom'));
        },
        { retryAttempts: 3, retryDelayMs: 1 }
      )
    ).rejects.toMatchInlineSnapshot(`[Error: boom]`);
    expect(attempts).toEqual(3);
  });

  it('waits retryDelayMs between each attempt ', async () => {
    const now = Date.now();
    let i = 0;
    await retryAsync(
      () => {
        if (i++ < 2) {
          return Promise.reject(new Error('boom'));
        } else {
          return Promise.resolve('done');
        }
      },
      { retryAttempts: 3, retryDelayMs: 100 }
    );
    // Would expect it to take 200ms but seems like timing inaccuracies
    // sometimes causes the duration to be measured as 199ms
    expect(Date.now() - now).toBeGreaterThanOrEqual(199);
  });
});
