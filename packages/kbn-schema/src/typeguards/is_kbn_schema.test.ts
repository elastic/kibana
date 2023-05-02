/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '../..';
import { isKbnSchema } from './is_kbn_schema';

describe('isKbnSchema', () => {
  it('returns true for every sub classes of `Type`', () => {
    expect(isKbnSchema(schema.any())).toBe(true);
    expect(isKbnSchema(schema.arrayOf(schema.string()))).toBe(true);
    expect(isKbnSchema(schema.boolean())).toBe(true);
    // expect(isKbnSchema(schema.buffer())).toBe(true);
    // expect(isKbnSchema(schema.byteSize())).toBe(true);
    // expect(isKbnSchema(schema.duration())).toBe(true);
    expect(isKbnSchema(schema.literal(''))).toBe(true);
    // expect(isKbnSchema(schema.mapOf(schema.string(), schema.number()))).toBe(true);
    expect(isKbnSchema(schema.nullable(schema.string()))).toBe(true);
    expect(isKbnSchema(schema.number())).toBe(true);
    expect(isKbnSchema(schema.object({}))).toBe(true);
    expect(isKbnSchema(schema.oneOf([schema.string()]))).toBe(true);
    // expect(isKbnSchema(schema.recordOf(schema.string(), schema.object({})))).toBe(true);
    expect(isKbnSchema(schema.string())).toBe(true);
    // expect(isKbnSchema(schema.stream())).toBe(true);
  });

  it('returns false for every javascript data type', () => {
    expect(isKbnSchema('foo')).toBe(false);
    expect(isKbnSchema(42)).toBe(false);
    expect(isKbnSchema(new Date())).toBe(false);
    expect(isKbnSchema(null)).toBe(false);
    expect(isKbnSchema(undefined)).toBe(false);
    expect(isKbnSchema([1, 2, 3])).toBe(false);
    expect(isKbnSchema({ foo: 'bar' })).toBe(false);
    expect(isKbnSchema(function () {})).toBe(false);
  });
});
