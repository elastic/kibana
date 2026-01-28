/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect as apiExpect } from '.';

describe('toHaveHeaders', () => {
  it('should pass when expected headers are present (partial match)', () => {
    const response = {
      headers: { 'content-type': 'application/json', 'x-custom': 'value', 'x-other': 'data' },
    };
    expect(() =>
      apiExpect(response).toHaveHeaders({ 'content-type': 'application/json', 'x-custom': 'value' })
    ).not.toThrow();
  });

  it('should fail when header is missing', () => {
    expect(() =>
      apiExpect({ headers: { 'content-type': 'application/json' } }).toHaveHeaders({
        'x-missing': 'value',
      })
    ).toThrow();
  });

  it('should fail when header value does not match', () => {
    expect(() =>
      apiExpect({ headers: { 'content-type': 'text/plain' } }).toHaveHeaders({
        'content-type': 'application/json',
      })
    ).toThrow();
  });

  it('should be case-insensitive for header keys', () => {
    expect(() =>
      apiExpect({ headers: { 'Content-Type': 'application/json' } }).toHaveHeaders({
        'content-type': 'application/json',
      })
    ).not.toThrow();
  });
});
