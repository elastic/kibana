/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { withTimeout } from './promise';

const delay = (ms: number, resolveValue?: any) =>
  new Promise((resolve) => setTimeout(resolve, ms, resolveValue));

describe('withTimeout', () => {
  it('resolves with a promise value if resolved in given timeout', async () => {
    await expect(
      withTimeout({
        promise: delay(10, 'value'),
        timeout: 200,
        errorMessage: 'error-message',
      })
    ).resolves.toBe('value');
  });

  it('rejects with errorMessage if not resolved in given time', async () => {
    await expect(
      withTimeout({
        promise: delay(200, 'value'),
        timeout: 10,
        errorMessage: 'error-message',
      })
    ).rejects.toMatchInlineSnapshot(`[Error: error-message]`);

    await expect(
      withTimeout({
        promise: new Promise((i) => i),
        timeout: 10,
        errorMessage: 'error-message',
      })
    ).rejects.toMatchInlineSnapshot(`[Error: error-message]`);
  });

  it('does not swallow promise error', async () => {
    await expect(
      withTimeout({
        promise: Promise.reject(new Error('from-promise')),
        timeout: 10,
        errorMessage: 'error-message',
      })
    ).rejects.toMatchInlineSnapshot(`[Error: from-promise]`);
  });
});
