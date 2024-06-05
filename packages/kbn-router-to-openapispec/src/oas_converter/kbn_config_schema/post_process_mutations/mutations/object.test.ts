/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import { joi2JsonInternal } from '../../parse';
import { processObject } from './object';

test.each([
  [
    schema.object({}),
    { type: 'object', properties: {}, additionalProperties: false, required: [] },
  ],
  [
    schema.object({ never: schema.never() }),
    { type: 'object', properties: {}, additionalProperties: false, required: [] },
  ],
  [
    schema.object(
      {
        key1: schema.string(),
        key2: schema.number({ defaultValue: 42 }),
      },
      { defaultValue: { key1: 'value1', key2: 42 } }
    ),
    {
      type: 'object',
      default: { key1: 'value1', key2: 42 },
      properties: {
        key1: { type: 'string' },
        key2: { type: 'number', default: 42 },
      },
      additionalProperties: false,
      required: ['key1'],
    },
  ],
])('processObject %#', (input, result) => {
  const parsed = joi2JsonInternal(input.getSchema());
  processObject(parsed);
  expect(parsed).toEqual(result);
});
