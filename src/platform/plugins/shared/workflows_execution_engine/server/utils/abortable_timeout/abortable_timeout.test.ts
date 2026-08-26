/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { abortableTimeout, TimeoutAbortedError } from './abortable_timeout';

describe('abortableTimeout', () => {
  it('resolves after the specified timeout', async () => {
    const controller = new AbortController();
    await expect(abortableTimeout(10, controller.signal)).resolves.toBeUndefined();
  });

  it('rejects immediately when signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(abortableTimeout(10000, controller.signal)).rejects.toThrow(TimeoutAbortedError);
  });

  it('rejects when signal is aborted during the wait', async () => {
    const controller = new AbortController();
    const promise = abortableTimeout(10000, controller.signal);
    controller.abort();
    await expect(promise).rejects.toThrow(TimeoutAbortedError);
  });

  it('TimeoutAbortedError has correct name', () => {
    const error = new TimeoutAbortedError();
    expect(error.name).toBe('TimeoutAbortedError');
    expect(error.message).toBe('Timeout aborted');
  });
});
