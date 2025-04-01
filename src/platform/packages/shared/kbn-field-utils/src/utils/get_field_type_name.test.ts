/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getFieldTypeName, UNKNOWN_FIELD_TYPE_MESSAGE } from './get_field_type_name';
import { KNOWN_FIELD_TYPES } from './field_types';

describe('FieldUtils getFieldTypeName()', () => {
  describe('known field types should be recognized', () => {
    it.each(Object.values(KNOWN_FIELD_TYPES))(
      `'%s' should return a string that does not match '${UNKNOWN_FIELD_TYPE_MESSAGE}'`,
      (field) => {
        const fieldTypeName = getFieldTypeName(field);
        expect(typeof fieldTypeName).toBe('string');
        expect(fieldTypeName).not.toBe(UNKNOWN_FIELD_TYPE_MESSAGE);
      }
    );
  });

  it(`should return '${UNKNOWN_FIELD_TYPE_MESSAGE}' when passed undefined`, () => {
    expect(getFieldTypeName(undefined)).toBe(UNKNOWN_FIELD_TYPE_MESSAGE);
  });

  it(`should return '${UNKNOWN_FIELD_TYPE_MESSAGE}' when passed 'unknown'`, () => {
    expect(getFieldTypeName('unknown')).toBe(UNKNOWN_FIELD_TYPE_MESSAGE);
  });

  it('should return the original type string back when passed an unknown field type', () => {
    expect(getFieldTypeName('unknown_field_type')).toBe('unknown_field_type');
  });
});
