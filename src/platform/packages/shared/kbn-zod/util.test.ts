/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '.';
import { z as z4 } from './v4';
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
  ])('"is" correctly identifies v3 schemas %#', (value, result) => {
    expect(isZod(value)).toBe(result);
  });

  test.each([
    [z4.string(), true],
    [z4.number(), true],
    [z4.boolean(), true],
    [z4.array(z4.string()), true],
    [z4.object({}), true],
    [z4.union([z4.string(), z4.number()]), true],
    [z4.literal('yes').optional(), true],
    [z4.record(z4.string(), z4.number()), true],
    [z4.any(), true],
  ])('"is" correctly identifies v4 schemas %#', (value, result) => {
    expect(isZod(value)).toBe(result);
  });
});
