/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  ConnectorResponseSizeLimitError,
  isConnectorResponseSizeLimitError,
} from './connector_response_size_limit_error';

describe('ConnectorResponseSizeLimitError', () => {
  it('exposes limitBytes, contentLengthBytes, and estimatedOutputBytes', () => {
    const error = new ConnectorResponseSizeLimitError({
      message: 'maxContentLength size of 1048576 exceeded',
      limitBytes: 1048576,
      contentLengthBytes: 2097152,
      estimatedOutputBytes: 2800000,
    });

    expect(error.message).toBe('maxContentLength size of 1048576 exceeded');
    expect(error.limitBytes).toBe(1048576);
    expect(error.contentLengthBytes).toBe(2097152);
    expect(error.estimatedOutputBytes).toBe(2800000);
  });

  it('allows undefined optional fields', () => {
    const error = new ConnectorResponseSizeLimitError({
      message: 'maxContentLength size of 1048576 exceeded',
    });

    expect(error.limitBytes).toBeUndefined();
    expect(error.contentLengthBytes).toBeUndefined();
    expect(error.estimatedOutputBytes).toBeUndefined();
  });
});

describe('isConnectorResponseSizeLimitError', () => {
  it('returns true for a ConnectorResponseSizeLimitError instance', () => {
    const error = new ConnectorResponseSizeLimitError({
      message: 'maxContentLength size of 1048576 exceeded',
      limitBytes: 1048576,
      contentLengthBytes: 2097152,
    });

    expect(isConnectorResponseSizeLimitError(error)).toBe(true);
  });

  it('returns true for an Error-like object with matching name (cross-realm)', () => {
    // Simulates an error thrown from a different JS realm (vm context, worker,
    // iframe, etc.) where `instanceof ConnectorResponseSizeLimitError` is false
    // but the error's shape and name are preserved.
    const crossRealmError = Object.assign(new Error('maxContentLength size of 1048576 exceeded'), {
      name: 'ConnectorResponseSizeLimitError',
      limitBytes: 1048576,
    });

    expect(crossRealmError).not.toBeInstanceOf(ConnectorResponseSizeLimitError);
    expect(isConnectorResponseSizeLimitError(crossRealmError)).toBe(true);
  });

  it('returns false for a plain Error', () => {
    expect(
      isConnectorResponseSizeLimitError(new Error('maxContentLength size of 1048576 exceeded'))
    ).toBe(false);
  });

  it('returns false for a subclassed Error whose name does not match', () => {
    class SomeOtherError extends Error {
      constructor(message: string) {
        super(message);
        this.name = 'SomeOtherError';
      }
    }

    expect(isConnectorResponseSizeLimitError(new SomeOtherError('boom'))).toBe(false);
  });
});
