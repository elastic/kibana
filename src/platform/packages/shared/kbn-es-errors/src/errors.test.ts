/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { errors } from '@elastic/elasticsearch';
import type { TransportResult } from '@elastic/elasticsearch';
import Boom from '@hapi/boom';
import {
  isResponseError,
  isUnauthorizedError,
  isRequestAbortedError,
  isMaximumResponseSizeExceededError,
  getDetailedErrorMessage,
} from './errors';

const createApiResponseError = ({
  statusCode = 200,
  headers = {},
  body = {},
}: {
  statusCode?: number;
  headers?: Record<string, string>;
  body?: Record<string, any>;
} = {}): TransportResult => {
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
    expect(isResponseError(new errors.ResponseError(createApiResponseError()))).toBe(true);
  });

  it('returns `false` when the input is not a `ResponseError`', () => {
    expect(isResponseError(new Error('foo'))).toBe(false);
    expect(isResponseError(new errors.ConnectionError('error', createApiResponseError()))).toBe(
      false
    );
    expect(isResponseError(new errors.ConfigurationError('foo'))).toBe(false);
  });
});

describe('isUnauthorizedError', () => {
  it('returns true when the input is a `ResponseError` and statusCode === 401', () => {
    expect(
      isUnauthorizedError(new errors.ResponseError(createApiResponseError({ statusCode: 401 })))
    ).toBe(true);
  });

  it('returns false when the input is a `ResponseError` and statusCode !== 401', () => {
    expect(
      isUnauthorizedError(new errors.ResponseError(createApiResponseError({ statusCode: 200 })))
    ).toBe(false);
    expect(
      isUnauthorizedError(new errors.ResponseError(createApiResponseError({ statusCode: 403 })))
    ).toBe(false);
    expect(
      isUnauthorizedError(new errors.ResponseError(createApiResponseError({ statusCode: 500 })))
    ).toBe(false);
  });

  it('returns `false` when the input is not a `ResponseError`', () => {
    expect(isUnauthorizedError(new Error('foo'))).toBe(false);
    expect(isUnauthorizedError(new errors.ConnectionError('error', createApiResponseError()))).toBe(
      false
    );
    expect(isUnauthorizedError(new errors.ConfigurationError('foo'))).toBe(false);
  });
});

describe('isRequestAbortedError', () => {
  it('returns `true` when the input is a `RequestAbortedError`', () => {
    expect(isRequestAbortedError(new errors.RequestAbortedError('Oh no'))).toBe(true);
  });
  it('returns `false` when the input is not a `RequestAbortedError`', () => {
    expect(
      isRequestAbortedError(new errors.ResponseError(createApiResponseError({ statusCode: 500 })))
    ).toBe(false);
  });
});

describe('isMaximumResponseSizeExceededError', () => {
  it('returns `true` when the input is a `RequestAbortedError` with the right message', () => {
    expect(
      isMaximumResponseSizeExceededError(
        new errors.RequestAbortedError(
          `The content length (9000) is bigger than the maximum allowed buffer (42)`
        )
      )
    ).toBe(true);
  });
  it('returns `false` when the input is a `RequestAbortedError` without the right message', () => {
    expect(isMaximumResponseSizeExceededError(new errors.RequestAbortedError('Oh no'))).toBe(false);
  });
  it('returns `false` when the input is not a `RequestAbortedError`', () => {
    expect(
      isMaximumResponseSizeExceededError(
        new errors.ResponseError(createApiResponseError({ statusCode: 500 }))
      )
    ).toBe(false);
  });
});

describe('#getDetailedErrorMessage', () => {
  it('extracts body payload from Boom error', () => {
    expect(getDetailedErrorMessage(Boom.badRequest())).toBe(
      JSON.stringify({ statusCode: 400, error: 'Bad Request', message: 'Bad Request' })
    );
    expect(getDetailedErrorMessage(Boom.unauthorized())).toBe(
      JSON.stringify({ statusCode: 401, error: 'Unauthorized', message: 'Unauthorized' })
    );

    const customBoomError = Boom.unauthorized();
    customBoomError.output.payload = {
      statusCode: 401,
      error: 'some-weird-error',
      message: 'some-weird-message',
    };
    expect(getDetailedErrorMessage(customBoomError)).toBe(
      JSON.stringify({
        statusCode: 401,
        error: 'some-weird-error',
        message: 'some-weird-message',
      })
    );
  });

  it('extracts body from Elasticsearch client response error', () => {
    expect(
      getDetailedErrorMessage(
        new errors.ResponseError(
          createApiResponseError({
            statusCode: 401,
            body: { field1: 'value-1', field2: 'value-2' },
          })
        )
      )
    ).toBe(JSON.stringify({ field1: 'value-1', field2: 'value-2' }));
  });

  it('extracts `cause` property', () => {
    expect(getDetailedErrorMessage(new Error('some-message', { cause: 'oops' }))).toBe(
      'some-message (cause: oops)'
    );

    expect(getDetailedErrorMessage(new Error('some-message', { cause: { oh: 'no' } }))).toBe(
      `some-message (cause: { oh: 'no' })`
    );

    expect(
      getDetailedErrorMessage(
        new TypeError('fetch failed', {
          cause: new Error('unable to get local issuer certificate'),
        })
      )
    ).toBe('fetch failed (cause: unable to get local issuer certificate)');
  });

  it('extracts `message` property', () => {
    expect(getDetailedErrorMessage(new Error('some-message'))).toBe('some-message');
  });
});
