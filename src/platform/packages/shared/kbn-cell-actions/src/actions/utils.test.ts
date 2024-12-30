/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { KBN_FIELD_TYPES } from '@kbn/field-types';
import {
  filterOutNullableValues,
  isTypeSupportedByDefaultActions,
  isValueSupportedByDefaultActions,
} from './utils';

describe('utils', () => {
  describe('isTypeSupportedByDefaultActions', () => {
    it('returns true when the type is number', () => {
      expect(isTypeSupportedByDefaultActions(KBN_FIELD_TYPES.NUMBER)).toBe(true);
    });

    it('returns true when the type is string', () => {
      expect(isTypeSupportedByDefaultActions(KBN_FIELD_TYPES.STRING)).toBe(true);
    });

    it('returns true when the type is ip', () => {
      expect(isTypeSupportedByDefaultActions(KBN_FIELD_TYPES.IP)).toBe(true);
    });

    it('returns true when the type is date', () => {
      expect(isTypeSupportedByDefaultActions(KBN_FIELD_TYPES.DATE)).toBe(true);
    });

    it('returns true when the type is boolean', () => {
      expect(isTypeSupportedByDefaultActions(KBN_FIELD_TYPES.BOOLEAN)).toBe(true);
    });

    it('returns false when the type is unknown', () => {
      expect(isTypeSupportedByDefaultActions(KBN_FIELD_TYPES.UNKNOWN)).toBe(false);
    });
  });

  describe('isValueSupportedByDefaultActions', () => {
    it('returns true when the value is an array of strings', () => {
      expect(isValueSupportedByDefaultActions(['string', 'string'])).toBe(true);
    });

    it('returns true when the value is an array of number', () => {
      expect(isValueSupportedByDefaultActions([2, 2])).toBe(true);
    });

    it('returns true when the value is an empty array', () => {
      expect(isValueSupportedByDefaultActions([])).toBe(true);
    });

    it('returns true when the value is an array of booleans', () => {
      expect(isValueSupportedByDefaultActions([false, true])).toBe(true);
    });

    it('returns false when the value is an mixed-type array', () => {
      expect(isValueSupportedByDefaultActions([2, 'string', false])).toBe(false);
    });
  });

  describe('filterOutNullableValues', () => {
    it('returns empty array when all values are nullable', () => {
      expect(filterOutNullableValues([null, undefined, null, undefined])).toEqual([]);
    });

    it('returns the same elements when they are all non-nullable', () => {
      expect(filterOutNullableValues([2, 'string', true])).toEqual([2, 'string', true]);
    });
  });
});
