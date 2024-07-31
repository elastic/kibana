/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { z } from '.';
import { isZod } from './util';

describe('isZod', () => {
  test.each([
    [{}, false],
    [1, false],
    [undefined, false],
    [null, false],
    [z.any(), true],
    [z.object({}).default({}), true],
    [z.never(), true],
    [z.string(), true],
    [z.number(), true],
    [z.map(z.string(), z.number()), true],
    [z.record(z.string(), z.number()), true],
    [z.array(z.string()), true],
    [z.object({}), true],
    [z.union([z.string(), z.number()]), true],
    [z.literal('yes').optional(), true],
  ])('"is" correctly identifies %#', (value, result) => {
    expect(isZod(value)).toBe(result);
  });
});
