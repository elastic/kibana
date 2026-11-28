/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { errors as esErrors } from '@elastic/elasticsearch';

import { isResponseTooLargeError } from './is_response_too_large_error';

const TOO_LARGE_STRING =
  'The content length (104867454) is bigger than the maximum allowed string (104857600)';
const TOO_LARGE_BUFFER =
  'The content length (104867454) is bigger than the maximum allowed buffer (104857600)';

describe('isResponseTooLargeError', () => {
  it.each([
    ['the error of the Elasticsearch client', new esErrors.RequestAbortedError(TOO_LARGE_STRING)],
    ['a compressed response', new esErrors.RequestAbortedError(TOO_LARGE_BUFFER)],
    ['the error as a search strategy rethrows it', new Error(TOO_LARGE_STRING)],
    ['the error of a search page', new Error(`CSV export search error: ${TOO_LARGE_STRING}`)],
  ])('is true for %s', (_, error) => {
    expect(isResponseTooLargeError(error)).toBe(true);
  });

  it.each([
    ['a request aborted for another reason', new esErrors.RequestAbortedError('Request aborted')],
    ['another error', new Error('An unknown error')],
    ['a message that is not an error', TOO_LARGE_STRING],
    ['nothing', undefined],
  ])('is false for %s', (_, error) => {
    expect(isResponseTooLargeError(error)).toBe(false);
  });
});
