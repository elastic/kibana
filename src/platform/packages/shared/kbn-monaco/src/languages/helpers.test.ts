/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { monaco } from '../monaco_imports';
import { createInterruptibleLanguageProvider } from './helpers';

describe('createInterruptibleLanguageProvider', () => {
  it('resolves with the provider result when the token is not cancelled', async () => {
    const tokenSource = new monaco.CancellationTokenSource();

    const result = await createInterruptibleLanguageProvider(
      () => 'provider-result',
      tokenSource.token
    );

    expect(result).toBe('provider-result');
    tokenSource.dispose();
  });

  it('rejects when the cancellation token is triggered', async () => {
    const tokenSource = new monaco.CancellationTokenSource();
    let releaseRun: (value: string) => void = () => {};
    const resultPromise = createInterruptibleLanguageProvider(
      () =>
        new Promise<string>((resolve) => {
          releaseRun = resolve;
        }),
      tokenSource.token
    );

    tokenSource.cancel();

    await expect(resultPromise).rejects.toThrow('AbortedDueToCancellationRequest');
    releaseRun('full-result');
    tokenSource.dispose();
  });
});
