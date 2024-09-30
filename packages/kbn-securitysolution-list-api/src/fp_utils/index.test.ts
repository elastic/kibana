/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { tryCatch } from 'fp-ts/lib/TaskEither';

import { toPromise } from '.';

describe('toPromise', () => {
  it('rejects with left if TaskEither is left', async () => {
    const task = tryCatch(() => Promise.reject(new Error('whoops')), String);

    await expect(toPromise(task)).rejects.toEqual('Error: whoops');
  });

  it('resolves with right if TaskEither is right', async () => {
    const task = tryCatch(() => Promise.resolve('success'), String);

    await expect(toPromise(task)).resolves.toEqual('success');
  });
});
