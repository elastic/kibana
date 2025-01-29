/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import { isJoiToJsonSpecialSchemas, joi2JsonInternal } from './parse';

describe('isJoiToJsonSpecialSchemas', () => {
  test.each([
    [joi2JsonInternal(schema.object({ foo: schema.string() }).getSchema()), false],
    [
      joi2JsonInternal(
        schema.object({ foo: schema.string() }, { meta: { id: 'yes' } }).getSchema()
      ),
      true,
    ],
    [{}, false],
  ])('correctly detects special schemas %#', (input, output) => {
    expect(isJoiToJsonSpecialSchemas(input)).toBe(output);
  });
});
