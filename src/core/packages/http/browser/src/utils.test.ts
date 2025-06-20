/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createHttpFetchError } from '@kbn/core-http-browser-mocks';
import { isServerOverloadedError } from './utils';

describe('isServerOverloadedError', () => {
  it('should return `false` for non-fetch errors', () => {
    expect(isServerOverloadedError(new Error('test'))).toBe(false);
  });

  it('should return `false` for fetch errors without response', () => {
    const error = createHttpFetchError('Server is overloaded');
    expect(isServerOverloadedError(error)).toBe(false);
  });

  it('should return `false` for fetch errors with response but without status 429', () => {
    const error = createHttpFetchError(
      'Server is overloaded',
      'error',
      {} as Request,
      {
        status: 500,
        headers: new Headers(),
      } as Response
    );

    expect(isServerOverloadedError(error)).toBe(false);
  });

  it('should return `false` for fetch errors with response but without "RateLimit" header', () => {
    const error = createHttpFetchError(
      'Server is overloaded',
      'error',
      {} as Request,
      {
        status: 429,
        headers: new Headers(),
      } as Response
    );

    expect(isServerOverloadedError(error)).toBe(false);
  });

  it('should return `false` for fetch errors with response status 429 and "RateLimit" header without "elu"', () => {
    const error = createHttpFetchError(
      'Server is overloaded',
      'error',
      {} as Request,
      {
        status: 429,
        headers: new Headers({
          RateLimit: 'other-info',
        }),
      } as Response
    );

    expect(isServerOverloadedError(error)).toBe(false);
  });

  it('should return `true` for fetch errors with response status 429 and "RateLimit" header containing "elu"', () => {
    const error = createHttpFetchError(
      'Server is overloaded',
      'error',
      {} as Request,
      {
        status: 429,
        headers: new Headers({
          RateLimit: 'elu; other-info',
        }),
      } as Response
    );

    expect(isServerOverloadedError(error)).toBe(true);
  });
});
