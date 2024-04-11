/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';

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
