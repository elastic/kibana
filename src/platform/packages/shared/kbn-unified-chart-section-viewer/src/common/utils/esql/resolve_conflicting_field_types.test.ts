/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ES_FIELD_TYPES } from '@kbn/field-types';
import { resolveConflictingFieldTypes } from './resolve_conflicting_field_types';

describe('resolveConflictingFieldTypes', () => {
  describe('single type', () => {
    it('should return the type when only one type is present', () => {
      const result = resolveConflictingFieldTypes([ES_FIELD_TYPES.DOUBLE]);
      expect(result).toBe(ES_FIELD_TYPES.DOUBLE);
    });

    it('should return undefined for empty array', () => {
      const result = resolveConflictingFieldTypes([]);
      expect(result).toBeUndefined();
    });
  });

  describe('duplicate types', () => {
    it('should return undefined when duplicates are present (no cast needed)', () => {
      const result = resolveConflictingFieldTypes([ES_FIELD_TYPES.DOUBLE, ES_FIELD_TYPES.DOUBLE]);
      expect(result).toBeUndefined();
    });
  });

  describe('float family (double, float, half_float, scaled_float)', () => {
    const floatFamilyCases: Array<{ types: ES_FIELD_TYPES[]; expected: ES_FIELD_TYPES }> = [
      { types: [ES_FIELD_TYPES.DOUBLE, ES_FIELD_TYPES.FLOAT], expected: ES_FIELD_TYPES.DOUBLE },
      { types: [ES_FIELD_TYPES.FLOAT, ES_FIELD_TYPES.DOUBLE], expected: ES_FIELD_TYPES.DOUBLE },
      {
        types: [ES_FIELD_TYPES.DOUBLE, ES_FIELD_TYPES.HALF_FLOAT],
        expected: ES_FIELD_TYPES.DOUBLE,
      },
      { types: [ES_FIELD_TYPES.FLOAT, ES_FIELD_TYPES.HALF_FLOAT], expected: ES_FIELD_TYPES.DOUBLE },
      {
        types: [ES_FIELD_TYPES.DOUBLE, ES_FIELD_TYPES.SCALED_FLOAT],
        expected: ES_FIELD_TYPES.DOUBLE,
      },
      {
        types: [ES_FIELD_TYPES.FLOAT, ES_FIELD_TYPES.HALF_FLOAT, ES_FIELD_TYPES.SCALED_FLOAT],
        expected: ES_FIELD_TYPES.DOUBLE,
      },
    ];

    floatFamilyCases.forEach(({ types, expected }) => {
      const typesName = types.join(' + ');
      it(`should resolve ${typesName} to ${expected}`, () => {
        const result = resolveConflictingFieldTypes(types);
        expect(result).toBe(expected);
      });
    });
  });

  describe('integer family (long, integer, short, byte)', () => {
    it('should resolve long + integer to long', () => {
      const result = resolveConflictingFieldTypes([ES_FIELD_TYPES.LONG, ES_FIELD_TYPES.INTEGER]);
      expect(result).toBe(ES_FIELD_TYPES.LONG);
    });

    it('should resolve integer + long to long', () => {
      const result = resolveConflictingFieldTypes([ES_FIELD_TYPES.INTEGER, ES_FIELD_TYPES.LONG]);
      expect(result).toBe(ES_FIELD_TYPES.LONG);
    });

    it('should resolve long + short to long', () => {
      const result = resolveConflictingFieldTypes([ES_FIELD_TYPES.LONG, ES_FIELD_TYPES.SHORT]);
      expect(result).toBe(ES_FIELD_TYPES.LONG);
    });

    it('should resolve long + byte to long', () => {
      const result = resolveConflictingFieldTypes([ES_FIELD_TYPES.LONG, ES_FIELD_TYPES.BYTE]);
      expect(result).toBe(ES_FIELD_TYPES.LONG);
    });

    it('should resolve integer + short + byte to long', () => {
      const result = resolveConflictingFieldTypes([
        ES_FIELD_TYPES.INTEGER,
        ES_FIELD_TYPES.SHORT,
        ES_FIELD_TYPES.BYTE,
      ]);
      expect(result).toBe(ES_FIELD_TYPES.LONG);
    });
  });

  describe('mixed numeric families', () => {
    it('should resolve double + long to double', () => {
      const result = resolveConflictingFieldTypes([ES_FIELD_TYPES.DOUBLE, ES_FIELD_TYPES.LONG]);
      expect(result).toBe(ES_FIELD_TYPES.DOUBLE);
    });

    it('should resolve float + integer to double', () => {
      const result = resolveConflictingFieldTypes([ES_FIELD_TYPES.FLOAT, ES_FIELD_TYPES.INTEGER]);
      expect(result).toBe(ES_FIELD_TYPES.DOUBLE);
    });

    it('should resolve long + double to double', () => {
      const result = resolveConflictingFieldTypes([ES_FIELD_TYPES.LONG, ES_FIELD_TYPES.DOUBLE]);
      expect(result).toBe(ES_FIELD_TYPES.DOUBLE);
    });

    it('should resolve mixed float and integer family to double', () => {
      const result = resolveConflictingFieldTypes([
        ES_FIELD_TYPES.DOUBLE,
        ES_FIELD_TYPES.FLOAT,
        ES_FIELD_TYPES.LONG,
        ES_FIELD_TYPES.INTEGER,
      ]);
      expect(result).toBe(ES_FIELD_TYPES.DOUBLE);
    });
  });

  describe('incompatible types', () => {
    it('should return undefined for keyword + double', () => {
      const result = resolveConflictingFieldTypes([ES_FIELD_TYPES.KEYWORD, ES_FIELD_TYPES.DOUBLE]);
      expect(result).toBeUndefined();
    });

    it('should return undefined for text + long', () => {
      const result = resolveConflictingFieldTypes([ES_FIELD_TYPES.TEXT, ES_FIELD_TYPES.LONG]);
      expect(result).toBeUndefined();
    });

    it('should return undefined for date + double', () => {
      const result = resolveConflictingFieldTypes([ES_FIELD_TYPES.DATE, ES_FIELD_TYPES.DOUBLE]);
      expect(result).toBeUndefined();
    });

    it('should return undefined for mixed numeric + non-numeric (double + long + keyword)', () => {
      const result = resolveConflictingFieldTypes([
        ES_FIELD_TYPES.DOUBLE,
        ES_FIELD_TYPES.LONG,
        ES_FIELD_TYPES.KEYWORD,
      ]);
      expect(result).toBeUndefined();
    });
  });
});
