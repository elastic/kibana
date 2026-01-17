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

describe('toHaveStatusText', () => {
  it('should pass when status text matches', () => {
    const response = createApiResponse({ statusText: 'OK' });
    expect(() => apiExpect(response).toHaveStatusText('OK')).not.toThrow();
  });

  it('should fail when status text does not match', () => {
    const response = createApiResponse({ statusText: 'Not Found' });
    expect(() => apiExpect(response).toHaveStatusText('OK')).toThrow(
      'Expected response to have status text "OK", but received "Not Found"'
    );
  });

  it('should support negation', () => {
    const response = createApiResponse({ statusText: 'OK' });
    expect(() => apiExpect(response).not.toHaveStatusText('Not Found')).not.toThrow();
  });

  it('should fail negation when status text matches', () => {
    const response = createApiResponse({ statusText: 'OK' });
    expect(() => apiExpect(response).not.toHaveStatusText('OK')).toThrow(
      'Expected response not to have status text "OK", but it did'
    );
  });
});
