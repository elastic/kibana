/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getFieldTypeDescription, UNKNOWN_FIELD_TYPE_DESC } from './get_field_type_description';
import { KNOWN_FIELD_TYPES } from './field_types';

describe('FieldUtils getFieldTypeDescription()', () => {
  describe('known field types should be recognized', () => {
    it.each(Object.values(KNOWN_FIELD_TYPES))(
      `'%s' should return a string that does not match '${UNKNOWN_FIELD_TYPE_DESC}'`,
      (field) => {
        const fieldTypeName = getFieldTypeDescription(field);
        expect(typeof fieldTypeName).toBe('string');
        expect(fieldTypeName).not.toBe(UNKNOWN_FIELD_TYPE_DESC);
      }
    );
  });

  it(`should return '${UNKNOWN_FIELD_TYPE_DESC}' when passed undefined`, () => {
    expect(getFieldTypeDescription(undefined)).toBe(UNKNOWN_FIELD_TYPE_DESC);
  });

  it(`should return '${UNKNOWN_FIELD_TYPE_DESC}' when passed 'unknown'`, () => {
    expect(getFieldTypeDescription('unknown')).toBe(UNKNOWN_FIELD_TYPE_DESC);
  });

  it('should return the original type string back when passed an unknown field type', () => {
    expect(getFieldTypeDescription('unknown_field_type')).toBe('unknown_field_type');
  });
});
