/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expectType } from 'tsd';

import { schema, type TypeOf } from '@kbn/config-schema';

import { objectUnion } from './object_union';

const typeA = schema.object({
  type: schema.literal('A'),
  str: schema.string(),
});

const typeB = schema.object({
  type: schema.literal('B'),
  num: schema.number(),
});

const typeAB = objectUnion([typeA, typeB]);

const typeABPlus = typeAB.extends(
  { bool: schema.boolean() },
  {
    defaultValue: { type: 'B', num: 123, bool: false },
    meta: { id: 'typeABPlus', title: 'Type AB Plus' },
  }
);

type TypeAB = TypeOf<typeof typeAB>;
type TypeABPlus = TypeOf<typeof typeABPlus>;

describe('objectUnion', () => {
  it.each<TypeAB>([
    { type: 'A', str: 'test' },
    { type: 'B', num: 123 },
  ])('should validate union for %j', (input) => {
    expect(typeAB.validate(input)).toEqual(input);
  });

  it.each([
    { type: 'A', str: 'test', extra: {} },
    { type: 'B', num: 123, extra: {} },
    { type: 'A', str: 123 },
    { type: 'B', num: 'string' },
  ])('should invalidate union for %j', (input) => {
    expect(() => typeAB.validate(input)).toThrowErrorMatchingSnapshot();
  });

  describe('extends', () => {
    it.each<TypeABPlus>([
      { type: 'A', str: 'test', bool: true },
      { type: 'B', num: 123, bool: false },
    ])('should validate extended union for %j', (input) => {
      expect(typeABPlus.validate(input)).toEqual(input);
    });

    it.each([
      { type: 'A', str: 'test', bool: true, extra: {} },
      { type: 'B', num: 123, bool: false, extra: {} },
      { type: 'A', str: 'test', bool: 'string' },
      { type: 'B', num: 123, bool: 'string' },
    ])('should invalidate extended union for %j', (input) => {
      expect(() => typeABPlus.validate(input)).toThrowErrorMatchingSnapshot();
    });
  });

  describe('types', () => {
    it('should validate correct union types', () => {
      expectType<TypeAB>({ type: 'A', str: 'test' });
      expectType<TypeAB>({ type: 'B', num: 123 });
    });

    it('should invalidate extra properties', () => {
      expectType<TypeAB>({
        type: 'A',
        str: '123',
        // @ts-expect-error - not a property
        extra: {},
      });
      expectType<TypeAB>({
        type: 'B',
        num: 123,
        // @ts-expect-error - not a property
        extra: {},
      });
    });

    describe('extends', () => {
      it('should validate extended union types', () => {
        expectType<TypeABPlus>({ type: 'B', num: 123, bool: false });
        expectType<TypeABPlus>({ type: 'B', num: 1, bool: true });
      });

      it('should invalidate extra properties', () => {
        expectType<TypeABPlus>({
          type: 'B',
          num: 123,
          bool: false,
          // @ts-expect-error - not a property
          extra: {},
        });
      });
    });
  });
});
