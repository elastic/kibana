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
  headers: { 'content-type': 'application/json' },
  body: {
    id: 123,
    name: 'test',
    active: true,
    user: { id: 1, name: 'John' },
    items: [{ id: 1 }, { id: 2 }],
  },
};

describe('toMatchJSON', () => {
  it('should pass when root properties match', () => {
    expect(() =>
      expectApi(response).toMatchJSON({ id: 123, name: 'test', active: true })
    ).not.toThrow();
  });

  it('should fail when property is missing', () => {
    expect(() => expectApi(response).toMatchJSON({ nonExistent: 'value' })).toThrow(
      'Missing properties: nonExistent'
    );
  });

  it('should fail when property value does not match', () => {
    expect(() => expectApi(response).toMatchJSON({ id: 999 })).toThrow(
      'Mismatched properties: id (expected 999, got 123)'
    );
  });

  it('should require nested objects to match exactly', () => {
    expect(() => expectApi(response).toMatchJSON({ user: { id: 1, name: 'John' } })).not.toThrow();
    expect(() => expectApi(response).toMatchJSON({ user: { id: 1 } })).toThrow(
      'Mismatched properties: user'
    );
  });

  it('should require arrays to match exactly', () => {
    expect(() => expectApi(response).toMatchJSON({ items: [{ id: 1 }, { id: 2 }] })).not.toThrow();
    expect(() => expectApi(response).toMatchJSON({ items: [{ id: 1 }] })).toThrow(
      'Mismatched properties: items'
    );
  });

  it('should support negation', () => {
    expect(() => expectApi(response).not.toMatchJSON({ id: 999 })).not.toThrow();
    expect(() => expectApi(response).not.toMatchJSON({ id: 123 })).toThrow(
      'Expected response body not to match, but it did'
    );
  });
});
