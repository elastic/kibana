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

describe('toHaveHeaders', () => {
  it('should pass when expected headers are present (partial match)', () => {
    const response = createApiResponse({
      headers: { 'content-type': 'application/json', 'x-custom': 'value', 'x-other': 'data' },
    });
    expect(() =>
      apiExpect(response).toHaveHeaders({ 'content-type': 'application/json', 'x-custom': 'value' })
    ).not.toThrow();
  });

  it('should fail when header is missing', () => {
    const response = createApiResponse({ headers: { 'content-type': 'application/json' } });
    expect(() => apiExpect(response).toHaveHeaders({ 'x-missing': 'value' })).toThrow(
      'Missing headers: x-missing'
    );
  });

  it('should fail when header value does not match', () => {
    const response = createApiResponse({ headers: { 'content-type': 'text/plain' } });
    expect(() => apiExpect(response).toHaveHeaders({ 'content-type': 'application/json' })).toThrow(
      'Mismatched headers: content-type (expected "application/json", got "text/plain")'
    );
  });

  it('should be case-insensitive for header keys', () => {
    const response = createApiResponse({ headers: { 'Content-Type': 'application/json' } });
    expect(() =>
      apiExpect(response).toHaveHeaders({ 'content-type': 'application/json' })
    ).not.toThrow();
  });

  it('should support negation', () => {
    const response = createApiResponse({ headers: { 'content-type': 'application/json' } });
    expect(() => apiExpect(response).not.toHaveHeaders({ 'x-forbidden': 'value' })).not.toThrow();
  });

  it('should fail negation when headers match', () => {
    const response = createApiResponse({ headers: { 'content-type': 'application/json' } });
    expect(() =>
      apiExpect(response).not.toHaveHeaders({ 'content-type': 'application/json' })
    ).toThrow('Expected response not to have the specified headers, but it did');
  });
});
