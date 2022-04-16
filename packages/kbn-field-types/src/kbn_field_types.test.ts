/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { castEsToKbnFieldTypeName, getKbnFieldType, getKbnTypeNames, KbnFieldType } from '.';

import { ES_FIELD_TYPES, KBN_FIELD_TYPES } from './types';

describe('utils/kbn_field_types', () => {
  describe('KbnFieldType', () => {
    test('defaults', () => {
      const kbnFieldType = new KbnFieldType({});

      expect(kbnFieldType).toHaveProperty('name', KBN_FIELD_TYPES.UNKNOWN);
      expect(kbnFieldType).toHaveProperty('sortable', false);
      expect(kbnFieldType).toHaveProperty('filterable', false);
      expect(kbnFieldType.esTypes).toEqual([]);
    });

    test('assigns name, sortable, filterable, and esTypes options to itself', () => {
      const name = 'name';
      const sortable = true;
      const filterable = true;
      const esTypes = [ES_FIELD_TYPES.LONG, ES_FIELD_TYPES.BYTE, ES_FIELD_TYPES.DATE];

      const kbnFieldType = new KbnFieldType({ name, sortable, filterable, esTypes });

      expect(kbnFieldType).toHaveProperty('name', name);
      expect(kbnFieldType).toHaveProperty('sortable', sortable);
      expect(kbnFieldType).toHaveProperty('filterable', filterable);
      expect(kbnFieldType.esTypes).toEqual(esTypes);
    });
  });

  describe('getKbnFieldType()', () => {
    test('returns a KbnFieldType instance by name', () => {
      const kbnFieldType = getKbnFieldType(ES_FIELD_TYPES.STRING);

      expect(kbnFieldType).toBeInstanceOf(KbnFieldType);
      expect(kbnFieldType).toHaveProperty('name', ES_FIELD_TYPES.STRING);
    });

    test('returns unknown for invalid name', () => {
      const kbnFieldType = getKbnFieldType('wrongType');

      expect(kbnFieldType).toHaveProperty('name', KBN_FIELD_TYPES.UNKNOWN);
    });
  });

  describe('castEsToKbnFieldTypeName()', () => {
    test('returns the kbnFieldType name that matches the esType', () => {
      expect(castEsToKbnFieldTypeName(ES_FIELD_TYPES.KEYWORD)).toBe('string');
      expect(castEsToKbnFieldTypeName(ES_FIELD_TYPES.FLOAT)).toBe('number');
      expect(castEsToKbnFieldTypeName(ES_FIELD_TYPES.UNSIGNED_LONG)).toBe('number');
    });

    test('returns unknown for unknown es types', () => {
      const castTo = castEsToKbnFieldTypeName('wrongType' as ES_FIELD_TYPES);

      expect(castTo).toBe('unknown');
    });
  });

  describe('getKbnTypeNames()', () => {
    test('returns a list of all kbnFieldType names', () => {
      const kbnTypeNames = getKbnTypeNames().sort();

      expect(kbnTypeNames).toEqual([
        KBN_FIELD_TYPES._SOURCE,
        KBN_FIELD_TYPES.ATTACHMENT,
        KBN_FIELD_TYPES.BOOLEAN,
        KBN_FIELD_TYPES.CONFLICT,
        KBN_FIELD_TYPES.DATE,
        KBN_FIELD_TYPES.DATE_RANGE,
        KBN_FIELD_TYPES.GEO_POINT,
        KBN_FIELD_TYPES.GEO_SHAPE,
        KBN_FIELD_TYPES.HISTOGRAM,
        KBN_FIELD_TYPES.IP,
        KBN_FIELD_TYPES.IP_RANGE,
        KBN_FIELD_TYPES.MURMUR3,
        KBN_FIELD_TYPES.NESTED,
        KBN_FIELD_TYPES.NUMBER,
        KBN_FIELD_TYPES.NUMBER_RANGE,
        KBN_FIELD_TYPES.OBJECT,
        KBN_FIELD_TYPES.STRING,
        KBN_FIELD_TYPES.UNKNOWN,
      ]);
    });
  });
});
