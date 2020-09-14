/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
