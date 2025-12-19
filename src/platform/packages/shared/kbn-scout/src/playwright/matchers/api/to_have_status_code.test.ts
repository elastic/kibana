/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expectApi } from './expect';
import type { ApiClientResponse } from '../../fixtures/scope/worker/api_client';

const createMockResponse = (overrides: Partial<ApiClientResponse> = {}): ApiClientResponse => ({
  statusCode: 200,
  statusMessage: 'OK',
  headers: { 'content-type': 'application/json' },
  body: {},
  ...overrides,
});

describe('toHaveStatusCode', () => {
  it('should pass when status code matches', () => {
    const response = createMockResponse({ statusCode: 200 });
    expect(() => expectApi(response).toHaveStatusCode(200)).not.toThrow();
  });

  it('should fail when status code does not match', () => {
    const response = createMockResponse({ statusCode: 404 });
    expect(() => expectApi(response).toHaveStatusCode(200)).toThrow(
      'Expected response to have status code 200, but received 404'
    );
  });

  it('should support negation', () => {
    const response = createMockResponse({ statusCode: 200 });
    expect(() => expectApi(response).not.toHaveStatusCode(404)).not.toThrow();
  });

  it('should fail negation when status code matches', () => {
    const response = createMockResponse({ statusCode: 200 });
    expect(() => expectApi(response).not.toHaveStatusCode(200)).toThrow(
      'Expected response not to have status code 200, but it did'
    );
  });
});
