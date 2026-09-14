/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { abortedRequestErrorFilter } from './aborted_request_error_filter';
import type { Payload } from './ebt_span_filter';

const createPayload = (errors: Array<Record<string, unknown>>): Payload =>
  ({
    errors,
    transactions: [],
  } as Payload);

const applyFilter = (payload: Payload): Payload => {
  const result = abortedRequestErrorFilter(payload);
  if (!result || typeof result === 'boolean') {
    throw new Error('expected payload');
  }
  return result;
};

describe('abortedRequestErrorFilter', () => {
  it('drops AbortError exceptions', () => {
    const payload = createPayload([
      {
        exception: {
          type: 'AbortError',
          message: 'Unhandled promise rejection: AbortError: The user aborted a request.',
        },
      },
      {
        exception: {
          type: 'TypeError',
          message: 'Unhandled promise rejection: TypeError: Failed to fetch',
        },
      },
    ]);

    expect(applyFilter(payload).errors).toEqual([
      {
        exception: {
          type: 'TypeError',
          message: 'Unhandled promise rejection: TypeError: Failed to fetch',
        },
      },
    ]);
  });

  it('drops empty unhandled Error rejections', () => {
    const payload = createPayload([
      {
        exception: {
          type: 'Error',
          message: 'Unhandled promise rejection: Error: ',
        },
      },
    ]);

    expect(applyFilter(payload).errors).toEqual([]);
  });

  it('drops aborted-without-reason messages', () => {
    const payload = createPayload([
      {
        exception: {
          type: 'Error',
          message: 'Unhandled promise rejection: AbortError: signal is aborted without reason',
        },
      },
    ]);

    expect(applyFilter(payload).errors).toEqual([]);
  });

  it('keeps unrelated errors', () => {
    const payload = createPayload([
      {
        exception: {
          type: 'Error',
          message: 'Unhandled promise rejection: Error: Not Found',
        },
      },
    ]);

    expect(applyFilter(payload).errors).toHaveLength(1);
  });

  it('does not throw if payload is empty', () => {
    const payload = {} as Payload;
    expect(() => abortedRequestErrorFilter(payload)).not.toThrow();
    expect(abortedRequestErrorFilter(payload)).toEqual({});
  });
});
