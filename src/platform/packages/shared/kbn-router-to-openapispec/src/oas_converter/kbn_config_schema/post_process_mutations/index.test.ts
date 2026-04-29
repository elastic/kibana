/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import { postProcessMutations } from '.';
import { joi2JsonInternal } from '../parse';
import { createCtx } from './context';

describe('postProcessMutations', () => {
  test('walks inner objects first so that "required" fields are populated correctly', () => {
    const parsed = joi2JsonInternal(
      schema.object({ foo: schema.object({ bar: schema.string() }) }).getSchema()
    );
    postProcessMutations({
      ctx: createCtx(),
      schema: parsed,
    });
    expect(parsed).toEqual({
      type: 'object',
      additionalProperties: false,
      properties: {
        foo: {
          type: 'object',
          additionalProperties: false,
          properties: {
            bar: { type: 'string' },
          },
          required: ['bar'],
        },
      },
      required: ['foo'],
    });
  });
});
