/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  ConnectorAuthorizationError,
  isConnectorAuthorizationError,
} from './connector_authorization_error';

describe('isConnectorAuthorizationError', () => {
  it('returns true for a ConnectorAuthorizationError instance', () => {
    const error = new ConnectorAuthorizationError({
      authMethod: 'oauth_authorization_code',
      reason: 'no_token',
      message: 'no token',
    });

    expect(isConnectorAuthorizationError(error)).toBe(true);
  });

  it('returns true for an Error-like object with matching name (cross-realm)', () => {
    // Simulates an error thrown from a different JS realm (vm context, worker,
    // iframe, etc.) where `instanceof ConnectorAuthorizationError` is false
    // but the error's shape and name are preserved.
    const crossRealmError = Object.assign(new Error('no token'), {
      name: 'ConnectorAuthorizationError',
      authMethod: 'ears',
      reason: 'no_token',
    });

    expect(crossRealmError).not.toBeInstanceOf(ConnectorAuthorizationError);
    expect(isConnectorAuthorizationError(crossRealmError)).toBe(true);
  });

  it('returns false for a plain Error', () => {
    expect(isConnectorAuthorizationError(new Error('boom'))).toBe(false);
  });

  it('returns false for a subclassed Error whose name does not match', () => {
    class SomeOtherError extends Error {
      constructor(message: string) {
        super(message);
        this.name = 'SomeOtherError';
      }
    }

    expect(isConnectorAuthorizationError(new SomeOtherError('boom'))).toBe(false);
  });
});
