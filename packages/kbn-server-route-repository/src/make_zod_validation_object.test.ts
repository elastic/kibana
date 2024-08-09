/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { z } from '@kbn/zod';
import { makeZodValidationObject } from './make_zod_validation_object';

describe('makeZodValidationObject', () => {
  it('translate path to params', () => {
    const schema = z.object({
      path: z.object({}),
    });
    expect(makeZodValidationObject(schema)).toStrictEqual({
      params: schema.shape.path,
      query: undefined,
      body: undefined,
    });
  });

  it('creates validator functions for all properties', () => {
    const schema = z.object({
      path: z.object({}),
      query: z.object({}),
      body: z.object({}),
    });

    expect(makeZodValidationObject(schema)).toStrictEqual({
      params: schema.shape.path,
      query: schema.shape.query,
      body: schema.shape.body,
    });
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
