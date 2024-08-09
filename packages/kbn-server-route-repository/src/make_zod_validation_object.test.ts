/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { z } from '@kbn/zod';
import { makeZodValidationObject } from './make_zod_validation_object';
import * as zodHelpers from '@kbn/zod-helpers/src/build_route_validation_with_zod';

describe('makeZodValidationObject', () => {
  it('translate path to params', () => {
    expect(
      makeZodValidationObject(
        z.object({
          path: z.object({}),
        })
      )
    ).toStrictEqual({
      params: expect.any(Function),
      query: undefined,
      body: undefined,
    });
  });

  it('creates validator functions for all properties', () => {
    const buildRouteValidationWithZodSpy = jest.spyOn(zodHelpers, 'buildRouteValidationWithZod');

    const schema = z.object({
      path: z.object({}),
      query: z.object({}),
      body: z.object({}),
    });

    expect(makeZodValidationObject(schema)).toStrictEqual({
      params: expect.any(Function),
      query: expect.any(Function),
      body: expect.any(Function),
    });

    expect(buildRouteValidationWithZodSpy).toHaveBeenCalledTimes(3);
    expect(buildRouteValidationWithZodSpy).toHaveBeenNthCalledWith(1, schema.shape.path);
    expect(buildRouteValidationWithZodSpy).toHaveBeenNthCalledWith(2, schema.shape.query);
    expect(buildRouteValidationWithZodSpy).toHaveBeenNthCalledWith(3, schema.shape.body);
  });

  it('sets all to undefined if schema is missing key', () => {
    const schema = z.object({});

    expect(makeZodValidationObject(schema)).toStrictEqual({
      params: undefined,
      query: undefined,
      body: undefined,
    });
  });
});
