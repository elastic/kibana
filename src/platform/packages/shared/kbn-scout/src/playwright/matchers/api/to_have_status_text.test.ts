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

describe('toHaveStatusText', () => {
  it('should pass when status text matches', () => {
    const response = createMockResponse({ statusMessage: 'OK' });
    expect(() => expectApi(response).toHaveStatusText('OK')).not.toThrow();
  });

  it('should fail when status text does not match', () => {
    const response = createMockResponse({ statusMessage: 'Not Found' });
    expect(() => expectApi(response).toHaveStatusText('OK')).toThrow(
      'Expected response to have status text "OK", but received "Not Found"'
    );
  });

  it('should support negation', () => {
    const response = createMockResponse({ statusMessage: 'OK' });
    expect(() => expectApi(response).not.toHaveStatusText('Not Found')).not.toThrow();
  });
});
