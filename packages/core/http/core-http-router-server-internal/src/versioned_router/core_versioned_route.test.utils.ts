/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// eslint-disable-next-line @kbn/imports/no_boundary_crossing
import { hapiMocks } from '@kbn/hapi-mocks';
import { ApiVersion, ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';
import { schema } from '@kbn/config-schema';
import { CoreKibanaRequest } from '../request';
import { passThroughValidation } from './core_versioned_route';

export function createRequest(
  {
    version,
    body,
    params,
    query,
  }: { version: undefined | ApiVersion; body?: object; params?: object; query?: object } = {
    version: '1',
  }
) {
  return CoreKibanaRequest.from(
    hapiMocks.createRequest({
      payload: body,
      params,
      query,
      headers: { [ELASTIC_HTTP_VERSION_HEADER]: version },
      app: { requestId: 'fakeId' },
    }),
    passThroughValidation
  );
}

export function createFooValidation() {
  const validateBodyFn = jest.fn();
  const validateParamsFn = jest.fn();
  const validateQueryFn = jest.fn();
  const validateOutputFn = jest.fn();
  const fooValidation = {
    request: {
      body: schema.object({
        foo: schema.number({
          validate: validateBodyFn,
        }),
      }),
      params: schema.object({
        foo: schema.number({
          validate: validateParamsFn,
        }),
      }),
      query: schema.object({
        foo: schema.number({
          validate: validateQueryFn,
        }),
      }),
    },
    response: {
      200: {
        body: schema.object({
          foo: schema.number({
            validate: validateOutputFn,
          }),
        }),
      },
    },
  };

  return {
    fooValidation,
    validateBodyFn,
    validateParamsFn,
    validateQueryFn,
    validateOutputFn,
  };
}
