/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import { is } from './lib';

describe('is', () => {
  test.each([
    [{}, false],
    [1, false],
    [undefined, false],
    [null, false],
    [schema.any(), false], // ignore any
    [schema.never(), false],
    [schema.string(), true],
    [schema.number(), true],
    [schema.mapOf(schema.string(), schema.number()), true],
    [schema.recordOf(schema.string(), schema.number()), true],
    [schema.arrayOf(schema.string()), true],
    [schema.object({}), true],
    [schema.oneOf([schema.string(), schema.number()]), true],
    [schema.maybe(schema.literal('yes')), true],
  ])('"is" correctly identifies %j', (value, result) => {
    expect(is(value)).toBe(result);
  });
});
