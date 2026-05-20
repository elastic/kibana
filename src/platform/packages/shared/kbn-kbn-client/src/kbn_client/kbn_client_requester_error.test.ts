/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { KbnClientRequesterError } from './kbn_client_requester_error';

describe('KbnClientRequesterError', () => {
  it('exposes status and cause directly', () => {
    const cause = new Error('Not Found');
    const wrapped = new KbnClientRequesterError('wrapper message', { status: 404, cause });

    expect(wrapped.status).toBe(404);
    expect(wrapped.cause).toBe(cause);
    expect(wrapped.name).toBe('KbnClientRequesterError');
    expect(wrapped.message).toBe('wrapper message');
  });

  it('works without status or cause', () => {
    const wrapped = new KbnClientRequesterError('plain message');

    expect(wrapped.status).toBeUndefined();
    expect(wrapped.cause).toBeUndefined();
    expect(wrapped.message).toBe('plain message');
  });
});
