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
  it('preserves status from response-like errors', () => {
    const original: any = new Error('Not Found');
    original.response = { status: 404, statusText: 'Not Found', data: { statusCode: 404 } };
    original.config = { method: 'GET', url: 'http://localhost/api/test' };

    const wrapped = new KbnClientRequesterError('wrapper message', original);

    expect(wrapped.responseError).toBeDefined();
    expect(wrapped.responseError!.status).toBe(404);
  });

  it('provides backward-compatible axiosError getter', () => {
    const original: any = new Error('Not Found');
    original.response = { status: 404 };

    const wrapped = new KbnClientRequesterError('wrapper message', original);

    expect(wrapped.axiosError).toBeDefined();
    expect(wrapped.axiosError!.status).toBe(404);
    expect(wrapped.axiosError!.response).toBeUndefined();
  });

  it('handles errors without response', () => {
    const original = new Error('Connection refused');

    const wrapped = new KbnClientRequesterError('wrapper message', original);

    expect(wrapped.responseError).toBeDefined();
    expect(wrapped.responseError!.status).toBeUndefined();
    expect(wrapped.responseError!.message).toBe('Connection refused');
  });

  it('handles non-error objects with response', () => {
    const original = { response: { status: 500 }, message: 'Server error', code: 'ERR_SERVER' };

    const wrapped = new KbnClientRequesterError('wrapper message', original);

    expect(wrapped.responseError).toBeDefined();
    expect(wrapped.responseError!.status).toBe(500);
  });
});
