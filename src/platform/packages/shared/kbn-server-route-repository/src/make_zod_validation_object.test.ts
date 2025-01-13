/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';
import { makeZodValidationObject } from './make_zod_validation_object';
import { noParamsValidationObject } from './validation_objects';

describe('makeZodValidationObject', () => {
  it('translate path to params', () => {
    const schema = z.object({
      path: z.object({}),
    });

    expect(makeZodValidationObject(schema)).toMatchObject({
      params: expect.anything(),
    });
  });

  it('makes all object types strict', () => {
    const schema = z.object({
      path: z.object({}),
      query: z.object({}),
      body: z.string(),
    });

    const pathStrictSpy = jest.spyOn(schema.shape.path, 'strict');
    const queryStrictSpy = jest.spyOn(schema.shape.query, 'strict');

    expect(makeZodValidationObject(schema)).toEqual({
      params: pathStrictSpy.mock.results[0].value,
      query: queryStrictSpy.mock.results[0].value,
      body: schema.shape.body,
    });
  });

  it('sets key to strict empty if schema is missing key', () => {
    const schema = z.object({});

    expect(makeZodValidationObject(schema)).toStrictEqual({
      params: noParamsValidationObject.params,
      query: noParamsValidationObject.query,
      body: noParamsValidationObject.body,
    });
  });
});
