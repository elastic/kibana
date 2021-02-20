/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  ResponseError,
  ConnectionError,
  ConfigurationError,
} from '@elastic/elasticsearch/lib/errors';
import { ApiResponse } from '@elastic/elasticsearch';
import { isResponseError, isUnauthorizedError } from './errors';

const createApiResponseError = ({
  statusCode = 200,
  headers = {},
  body = {},
}: {
  statusCode?: number;
  headers?: Record<string, string>;
  body?: Record<string, any>;
} = {}): ApiResponse => {
  return {
    body,
    statusCode,
    headers,
    warnings: [],
    meta: {} as any,
  };
};

describe('isResponseError', () => {
  it('returns `true` when the input is a `ResponseError`', () => {
    expect(isResponseError(new ResponseError(createApiResponseError()))).toBe(true);
  });

  it('returns `false` when the input is not a `ResponseError`', () => {
    expect(isResponseError(new Error('foo'))).toBe(false);
    expect(isResponseError(new ConnectionError('error', createApiResponseError()))).toBe(false);
    expect(isResponseError(new ConfigurationError('foo'))).toBe(false);
  });
});

describe('isUnauthorizedError', () => {
  it('returns true when the input is a `ResponseError` and statusCode === 401', () => {
    expect(
      isUnauthorizedError(new ResponseError(createApiResponseError({ statusCode: 401 })))
    ).toBe(true);
  });

  it('returns false when the input is a `ResponseError` and statusCode !== 401', () => {
    expect(
      isUnauthorizedError(new ResponseError(createApiResponseError({ statusCode: 200 })))
    ).toBe(false);
    expect(
      isUnauthorizedError(new ResponseError(createApiResponseError({ statusCode: 403 })))
    ).toBe(false);
    expect(
      isUnauthorizedError(new ResponseError(createApiResponseError({ statusCode: 500 })))
    ).toBe(false);
  });

  it('returns `false` when the input is not a `ResponseError`', () => {
    expect(isUnauthorizedError(new Error('foo'))).toBe(false);
    expect(isUnauthorizedError(new ConnectionError('error', createApiResponseError()))).toBe(false);
    expect(isUnauthorizedError(new ConfigurationError('foo'))).toBe(false);
  });
});
