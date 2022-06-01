/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { isFilterable } from '.';
import type { DataViewField } from './fields';

const mockField = {
  name: 'foo',
  scripted: false,
  searchable: true,
  type: 'string',
} as DataViewField;

describe('isFilterable', () => {
  describe('types', () => {
    it('should return true for filterable types', () => {
      ['string', 'number', 'date', 'ip', 'boolean'].forEach((type) => {
        expect(isFilterable({ ...mockField, type } as DataViewField)).toBe(true);
      });
    });

    it('should return false for filterable types if the field is not searchable', () => {
      ['string', 'number', 'date', 'ip', 'boolean'].forEach((type) => {
        expect(isFilterable({ ...mockField, type, searchable: false } as DataViewField)).toBe(
          false
        );
      });
    });

    it('should return false for un-filterable types', () => {
      ['geo_point', 'geo_shape', 'attachment', 'murmur3', '_source', 'unknown', 'conflict'].forEach(
        (type) => {
          expect(isFilterable({ ...mockField, type } as DataViewField)).toBe(false);
        }
      );
    });
  });

  it('should return true for scripted fields', () => {
    expect(isFilterable({ ...mockField, scripted: true, searchable: false } as DataViewField)).toBe(
      true
    );
  });

  it('should return true for the _id field', () => {
    expect(isFilterable({ ...mockField, name: '_id' } as DataViewField)).toBe(true);
  });
});
