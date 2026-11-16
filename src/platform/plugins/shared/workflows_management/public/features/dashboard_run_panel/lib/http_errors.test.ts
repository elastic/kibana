/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getErrorMessage, isNotFoundError } from './http_errors';

const httpError = (status: number, body?: unknown) =>
  Object.assign(new Error('Bad Request'), {
    name: 'HttpFetchError',
    request: {},
    response: { status },
    body,
  });

describe('isNotFoundError', () => {
  it('is true only for HTTP 404 responses', () => {
    expect(isNotFoundError(httpError(404))).toBe(true);
    expect(isNotFoundError(httpError(500))).toBe(false);
    expect(isNotFoundError(new Error('404'))).toBe(false);
  });
});

describe('getErrorMessage', () => {
  it("prefers the server's message over the HTTP status text", () => {
    expect(getErrorMessage(httpError(400, { message: 'Workflow is disabled' }))).toBe(
      'Workflow is disabled'
    );
  });

  it('falls back to the error message', () => {
    expect(getErrorMessage(httpError(502))).toBe('Bad Request');
    expect(getErrorMessage(new Error('Network down'))).toBe('Network down');
    expect(getErrorMessage('timeout')).toBe('timeout');
  });
});
