/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { monaco, CancellationError } from '../monaco_imports';
import { handleInterruptibleMonacoOperation } from './helpers';

describe('handleInterruptibleMonacoOperation', () => {
  let tokenSource: monaco.CancellationTokenSource;
  beforeEach(() => {
    tokenSource = new monaco.CancellationTokenSource();
  });

  afterEach(() => {
    tokenSource.dispose();
  });

  it('resolves with the provider result when the token is not cancelled', async () => {
    const result = await handleInterruptibleMonacoOperation(
      () => 'provider-result',
      tokenSource.token
    );

    expect(result).toBe('provider-result');
  });

  it('rejects when the cancellation token is triggered', async () => {
    let releaseRun: (value: string) => void = () => {};
    const resultPromise = handleInterruptibleMonacoOperation(
      () =>
        new Promise<string>((resolve) => {
          releaseRun = resolve;
        }),
      tokenSource.token
    );

    tokenSource.cancel();

    await expect(resultPromise).rejects.toThrow(CancellationError);
    releaseRun('full-result');
  });

  it('rejects when the cancellation token has already been triggered', async () => {
    tokenSource.cancel();

    let releaseRun: ((value: string) => void) | null = null;
    const resultPromise = handleInterruptibleMonacoOperation(
      () =>
        new Promise<string>((resolve) => {
          releaseRun = resolve;
        }),
      tokenSource.token
    );

    await expect(resultPromise).rejects.toThrow(CancellationError);
    expect(releaseRun).toBeNull();
  });
});
