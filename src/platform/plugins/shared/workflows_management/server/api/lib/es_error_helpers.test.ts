/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { errors } from '@elastic/elasticsearch';

import {
  getElasticsearchErrorMessage,
  isElasticsearchQueryError,
  isIndexNotFoundError,
  isResultWindowTooLargeError,
} from './es_error_helpers';

const makeResponseError = (type: string, statusCode = 404) =>
  new errors.ResponseError({
    statusCode,
    body: { error: { type, reason: `test ${type}` } },
    headers: {},
    warnings: [],
    meta: {} as any,
  });

describe('isIndexNotFoundError', () => {
  it('returns true for index_not_found_exception', () => {
    expect(isIndexNotFoundError(makeResponseError('index_not_found_exception'))).toBe(true);
  });

  it('returns false for other ES response errors', () => {
    expect(isIndexNotFoundError(makeResponseError('search_phase_execution_exception'))).toBe(false);
  });

  it('returns false for plain Error', () => {
    expect(isIndexNotFoundError(new Error('something'))).toBe(false);
  });

  it('returns false for null/undefined', () => {
    expect(isIndexNotFoundError(null)).toBe(false);
    expect(isIndexNotFoundError(undefined)).toBe(false);
  });
});

describe('isElasticsearchQueryError', () => {
  it('returns true for search_phase_execution_exception with query_shard_exception root cause', () => {
    const error = new errors.ResponseError({
      statusCode: 400,
      body: {
        error: {
          type: 'search_phase_execution_exception',
          reason: 'all shards failed',
          root_cause: [
            {
              type: 'query_shard_exception',
              reason: 'failed to create query: For input string: "2s"',
            },
          ],
        },
      },
      headers: {},
      warnings: [],
      meta: {} as any,
    });

    expect(isElasticsearchQueryError(error)).toBe(true);
    expect(getElasticsearchErrorMessage(error)).toBe(
      'failed to create query: For input string: "2s"'
    );
  });

  it('returns false for index_not_found_exception', () => {
    expect(isElasticsearchQueryError(makeResponseError('index_not_found_exception'))).toBe(false);
  });
});

describe('isResultWindowTooLargeError', () => {
  it('returns true for an ES result window rejection', () => {
    const error = new errors.ResponseError({
      statusCode: 400,
      body: {
        error: {
          type: 'search_phase_execution_exception',
          root_cause: [
            {
              type: 'illegal_argument_exception',
              reason:
                'Result window is too large, from + size must be less than or equal to: [10000] but was [10000100].',
            },
          ],
        },
      },
      headers: {},
      warnings: [],
      meta: {} as any,
    });
    expect(isResultWindowTooLargeError(error)).toBe(true);
  });

  it('returns false for other ES response errors', () => {
    expect(isResultWindowTooLargeError(makeResponseError('illegal_argument_exception', 400))).toBe(
      false
    );
  });

  it('returns false for plain Error', () => {
    expect(isResultWindowTooLargeError(new Error('Result window is too large'))).toBe(false);
  });
});
