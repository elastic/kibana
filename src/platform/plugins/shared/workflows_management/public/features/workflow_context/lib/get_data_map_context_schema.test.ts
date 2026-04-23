/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DynamicStepContextSchema } from '@kbn/workflows';
import { z } from '@kbn/zod/v4';
import { getDataMapContextSchema } from './get_data_map_context_schema';

describe('getDataMapContextSchema', () => {
  describe('index schema', () => {
    it('always returns z.number() for the index schema', () => {
      const { index } = getDataMapContextSchema(DynamicStepContextSchema, [1, 2, 3]);
      expect(index.safeParse(0).success).toBe(true);
      expect(index.safeParse(5).success).toBe(true);
      expect(index.safeParse('not a number').success).toBe(false);
    });

    it('returns z.number() for index even with empty items', () => {
      const { index } = getDataMapContextSchema(DynamicStepContextSchema, []);
      expect(index.safeParse(0).success).toBe(true);
    });
  });

  describe('item schema from literal arrays', () => {
    it('infers string item schema from a string array', () => {
      const { item } = getDataMapContextSchema(DynamicStepContextSchema, ['a', 'b', 'c']);
      expect(item.safeParse('hello').success).toBe(true);
      expect(item.safeParse(123).success).toBe(false);
    });

    it('infers number item schema from a number array', () => {
      const { item } = getDataMapContextSchema(DynamicStepContextSchema, [1, 2, 3]);
      expect(item.safeParse(42).success).toBe(true);
      expect(item.safeParse('string').success).toBe(false);
    });

    it('infers boolean item schema from a boolean array', () => {
      const { item } = getDataMapContextSchema(DynamicStepContextSchema, [true, false]);
      expect(item.safeParse(true).success).toBe(true);
      expect(item.safeParse('true').success).toBe(false);
    });

    it('infers object item schema from an object array', () => {
      const { item } = getDataMapContextSchema(DynamicStepContextSchema, [
        { name: 'Alice', age: 30 },
      ]);
      expect(item.safeParse({ name: 'Bob', age: 25 }).success).toBe(true);
    });

    it('returns z.unknown() for an empty array', () => {
      const { item } = getDataMapContextSchema(DynamicStepContextSchema, []);
      // z.unknown() accepts anything
      expect(item.safeParse('anything').success).toBe(true);
      expect(item.safeParse(42).success).toBe(true);
      expect(item.safeParse(null).success).toBe(true);
    });

    it('uses the first element to infer the type', () => {
      // Mixed array - type is inferred from first element only
      const { item } = getDataMapContextSchema(DynamicStepContextSchema, ['first', 123, true]);
      expect(item.safeParse('a string').success).toBe(true);
      expect(item.safeParse(123).success).toBe(false);
    });
  });

  describe('item schema from non-array, non-string items', () => {
    it('returns z.unknown() for number items', () => {
      const { item } = getDataMapContextSchema(DynamicStepContextSchema, 42);
      expect(item.safeParse('anything').success).toBe(true);
    });

    it('returns z.unknown() for object items', () => {
      const { item } = getDataMapContextSchema(DynamicStepContextSchema, { key: 'val' });
      expect(item.safeParse('anything').success).toBe(true);
    });

    it('returns z.unknown() for null items', () => {
      const { item } = getDataMapContextSchema(DynamicStepContextSchema, null);
      expect(item.safeParse('anything').success).toBe(true);
    });

    it('returns z.unknown() for undefined items', () => {
      const { item } = getDataMapContextSchema(DynamicStepContextSchema, undefined);
      expect(item.safeParse('anything').success).toBe(true);
    });

    it('returns z.unknown() for boolean items', () => {
      const { item } = getDataMapContextSchema(DynamicStepContextSchema, true);
      expect(item.safeParse('anything').success).toBe(true);
    });
  });

  describe('item schema from string variable reference', () => {
    it('returns z.unknown() for a string that is not a variable reference', () => {
      const { item } = getDataMapContextSchema(DynamicStepContextSchema, 'just a plain string');
      expect(item.safeParse('anything').success).toBe(true);
    });

    it('returns z.unknown() for an invalid variable reference', () => {
      const { item } = getDataMapContextSchema(DynamicStepContextSchema, '{{ invalid..path }}');
      expect(item.safeParse('anything').success).toBe(true);
    });

    it('returns z.unknown() for a variable reference with an invalid path format', () => {
      const { item } = getDataMapContextSchema(DynamicStepContextSchema, '{{ 123invalid }}');
      expect(item.safeParse('anything').success).toBe(true);
    });

    it('resolves array element schema from a variable referencing an array in the schema', () => {
      const schemaWithArray = DynamicStepContextSchema.extend({
        steps: z.object({
          myStep: z.object({
            output: z.object({
              items: z.array(z.string()),
            }),
          }),
        }),
      });

      const { item } = getDataMapContextSchema(schemaWithArray, '{{ steps.myStep.output.items }}');

      // Should resolve to the element type of the array (z.string())
      expect(item.safeParse('hello').success).toBe(true);
      expect(item.safeParse(123).success).toBe(false);
    });

    it('returns z.unknown() when variable references a non-array schema property', () => {
      const schemaWithString = DynamicStepContextSchema.extend({
        steps: z.object({
          myStep: z.object({
            output: z.object({
              name: z.string(),
            }),
          }),
        }),
      });

      const { item } = getDataMapContextSchema(schemaWithString, '{{ steps.myStep.output.name }}');

      // name is z.string(), not z.array(), so should return z.unknown()
      expect(item.safeParse('anything').success).toBe(true);
      expect(item.safeParse(123).success).toBe(true);
    });

    it('returns z.unknown() when variable path does not exist in schema', () => {
      const { item } = getDataMapContextSchema(
        DynamicStepContextSchema,
        '{{ steps.nonexistent.output.items }}'
      );
      expect(item.safeParse('anything').success).toBe(true);
    });
  });
});
