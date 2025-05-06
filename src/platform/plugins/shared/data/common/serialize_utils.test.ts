/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { MultiFieldKey, RangeKey } from '.';
import { SerializedRangeKey } from './search';
import { SerializedMultiFieldKey } from './search/aggs/buckets/multi_field_key';
import { SerializableType, deserializeField, serializeField } from './serialize_utils';

describe('serializeField/deserializeField', () => {
  describe('MultiFieldKey', () => {
    it.each([
      ['single value', { key: 'one' }],
      ['multiple values', { key: ['one', 'two', 'three'] }],
    ])('should serialize and deserialize %s', (_, bucket) => {
      const initial = new MultiFieldKey(bucket);
      const serialized = serializeField(initial) as SerializedMultiFieldKey;
      expect(serialized.type).toBe(SerializableType.MultiFieldKey);
      const deserialized = deserializeField(serialized) as MultiFieldKey;
      expect(deserialized).toMatchObject(initial);
      expect(deserialized.toString()).toBe(initial.toString());
      expect(deserialized).toBeInstanceOf(MultiFieldKey);
    });
  });

  describe('RangeKey', () => {
    const label = 'some label';
    it.each([
      ['open range', {}, undefined],
      ['open upper range', { from: 0 }, undefined],
      ['open lower range', { to: 100 }, undefined],
      ['fully closed range', { from: 0, to: 100 }, undefined],
      ['open range', {}, [{ label }]],
      ['open upper range w/ label', { from: 0 }, [{ from: 0, label }]],
      ['open lower range w/ label', { to: 100 }, [{ to: 100, label }]],
      ['fully closed range w/ label', { from: 0, to: 100 }, [{ from: 0, to: 100, label }]],
    ])('should serialize and deserialize %s', (_, bucket, ranges) => {
      const initial = new RangeKey(bucket, ranges);
      const serialized = serializeField(initial) as SerializedRangeKey;
      expect(serialized.type).toBe(SerializableType.RangeKey);
      expect(serialized.ranges).toHaveLength(initial.label ? 1 : 0);
      const deserialized = deserializeField(serialized) as RangeKey;
      expect(RangeKey.idBucket(deserialized)).toBe(RangeKey.idBucket(initial));
      expect(deserialized.gte).toBe(initial.gte);
      expect(deserialized.lt).toBe(initial.lt);
      expect(deserialized.label).toBe(initial.label);
      expect(deserialized).toBeInstanceOf(RangeKey);
    });
  });

  describe('Primitive values', () => {
    it.each([
      ['strings', 'some string'],
      ['strings (empty)', ''],
      ['numbers', 123],
      ['numbers (0)', 0],
      ['boolean (true)', true],
      ['boolean (false)', false],
      ['object', { test: 1 }],
      ['array', ['test', 1]],
      ['undefined', undefined],
      ['null', null],
    ])('should deserialize %s', (_, initial) => {
      const serialized = serializeField(initial);
      const deserialized = deserializeField(serialized);
      expect(deserialized).toEqual(initial);
    });
  });
});
