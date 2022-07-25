/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { errors } from '@elastic/elasticsearch';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { kibanaResponseFactory as response } from '@kbn/core/server';
import { handleEsError } from './handle_es_error';

const { ResponseError } = errors;

const anyObject: any = {};

describe('handleEsError', () => {
  test('top-level reason is an empty string', () => {
    const emptyReasonError = new ResponseError({
      warnings: [],
      meta: anyObject,
      body: {
        error: {
          root_cause: [],
          type: 'search_phase_execution_exception',
          reason: '', // Empty reason
          phase: 'fetch',
          grouped: true,
          failed_shards: [],
          caused_by: {
            type: 'too_many_buckets_exception',
            reason: 'This is the nested reason',
            max_buckets: 100,
          },
        },
      },
      statusCode: 503,
      headers: {},
    });

    const { payload, status } = handleEsError({ error: emptyReasonError, response });

    expect(payload.message).toEqual('This is the nested reason');
    expect(status).toBe(503);
  });

  test('empty error', () => {
    const { payload, status } = handleEsError({
      error: new ResponseError({
        body: {},
        statusCode: 400,
        headers: {},
        meta: anyObject,
        warnings: [],
      }),
      response,
    });

    expect(payload).toEqual({
      attributes: { causes: undefined, error: undefined },
      message: '{}',
    });

    expect(status).toBe(400);
  });

  test('unknown object', () => {
    expect(() => handleEsError({ error: anyObject, response })).toThrow();
  });
});
