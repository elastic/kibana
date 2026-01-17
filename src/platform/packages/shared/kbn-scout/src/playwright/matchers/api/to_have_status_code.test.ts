/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect as apiExpect } from '.';
import { createApiResponse } from './utils';
import { createMatcherError } from './utils'; // adjust path if needed

describe('toHaveStatusCode', () => {
  it('should pass when status code matches', () => {
    const response = createApiResponse({ status: 200 });
    expect(() => apiExpect(response).toHaveStatusCode(200)).not.toThrow();
  });

  it('should fail when status code does not match', () => {
    const response = createApiResponse({ status: 404 });
    const expectedError = createMatcherError(200, 'toHaveStatusCode', 404, false).message;

    expect(() => apiExpect(response).toHaveStatusCode(200)).toThrow(expectedError);
  });

  it('should support negation', () => {
    const response = createApiResponse({ status: 200 });
    expect(() => apiExpect(response).not.toHaveStatusCode(404)).not.toThrow();
  });

  it('should fail negation when status code matches', () => {
    const response = createApiResponse({ status: 200 });
    const expectedError = createMatcherError(200, 'toHaveStatusCode', 200, true).message;

    expect(() => apiExpect(response).not.toHaveStatusCode(200)).toThrow(expectedError);
  });
});
