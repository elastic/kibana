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

const response: ApiClientResponse = {
  statusCode: 200,
  statusMessage: 'OK',
  headers: {
    'Content-Type': 'application/json',
    'x-request-id': '12345',
    'cache-control': 'no-cache',
    'set-cookie': ['cookie1=value1', 'cookie2=value2'],
  },
  body: {},
};

describe('toHaveHeaders', () => {
  it('should pass when header matches', () => {
    expect(() =>
      expectApi(response).toHaveHeaders({ 'content-type': 'application/json' })
    ).not.toThrow();
  });

  it('should be case-insensitive for header keys', () => {
    expect(() =>
      expectApi(response).toHaveHeaders({ 'CONTENT-TYPE': 'application/json' })
    ).not.toThrow();
  });

  it('should fail when header is missing', () => {
    expect(() => expectApi(response).toHaveHeaders({ 'x-non-existent': 'value' })).toThrow(
      'Missing headers: x-non-existent'
    );
  });

  it('should fail when header value does not match', () => {
    expect(() => expectApi(response).toHaveHeaders({ 'content-type': 'text/plain' })).toThrow(
      'Mismatched headers: content-type (expected "text/plain", got "application/json")'
    );
  });

  it('should support checking multiple headers at once', () => {
    expect(() =>
      expectApi(response).toHaveHeaders({
        'content-type': 'application/json',
        'x-request-id': '12345',
        'cache-control': 'no-cache',
      })
    ).not.toThrow();
  });

  it('should support negation', () => {
    expect(() =>
      expectApi(response).not.toHaveHeaders({ 'x-non-existent': 'value' })
    ).not.toThrow();
  });

  it('should join array header values with comma', () => {
    expect(() =>
      expectApi(response).toHaveHeaders({ 'set-cookie': 'cookie1=value1, cookie2=value2' })
    ).not.toThrow();
  });
});
