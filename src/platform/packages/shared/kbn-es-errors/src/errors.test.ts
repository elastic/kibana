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

describe('getDetailedErrorMessage', () => {
  describe('Elasticsearch ResponseError', () => {
    it('returns stringified body for ResponseError', () => {
      const body = { error: { type: 'search_phase_execution_exception', reason: 'test' } };
      const error = new errors.ResponseError(createApiResponseError({ statusCode: 500, body }));
      expect(getDetailedErrorMessage(error)).toBe(JSON.stringify(body));
    });
  });

  describe('Boom errors', () => {
    it('returns stringified payload for Boom errors', () => {
      const error = Boom.badRequest('Invalid input');
      const result = getDetailedErrorMessage(error);
      expect(result).toContain('Invalid input');
      expect(result).toContain('Bad Request');
    });

    it('handles Boom internal errors', () => {
      const error = Boom.internal('Server error');
      const result = getDetailedErrorMessage(error);
      expect(result).toContain('Internal Server Error');
    });
  });

  describe('standard Error objects', () => {
    it('returns message for simple errors', () => {
      const error = new Error('Simple error message');
      expect(getDetailedErrorMessage(error)).toBe('Simple error message');
    });

    it('includes cause message when cause is an Error', () => {
      const cause = new Error('Root cause');
      const error = new Error('Main error', { cause });
      expect(getDetailedErrorMessage(error)).toBe('Main error (cause: Root cause)');
    });

    it('includes cause when cause is a string', () => {
      const error = new Error('Main error', { cause: 'String cause' });
      expect(getDetailedErrorMessage(error)).toBe('Main error (cause: String cause)');
    });

    it('inspects cause when cause is an object', () => {
      const error = new Error('Main error', { cause: { code: 'ERR_CODE', detail: 'details' } });
      const result = getDetailedErrorMessage(error);
      expect(result).toContain('Main error (cause:');
      expect(result).toContain('ERR_CODE');
    });
  });

  describe('non-Error values', () => {
    it('converts non-Error values to string', () => {
      expect(getDetailedErrorMessage('string error')).toBe('string error');
      expect(getDetailedErrorMessage(42)).toBe('42');
      expect(getDetailedErrorMessage(null)).toBe('null');
      expect(getDetailedErrorMessage(undefined)).toBe('undefined');
    });
  });
});
