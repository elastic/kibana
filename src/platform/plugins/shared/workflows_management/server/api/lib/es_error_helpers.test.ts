/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { errors } from '@elastic/elasticsearch';

import { isIndexNotFoundError } from './es_error_helpers';

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
