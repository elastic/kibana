/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DataView } from '@kbn/data-views-plugin/common';
import type { DatatableColumnMeta } from '@kbn/expressions-plugin/common';
import { getDataViewFieldOrCreateFromColumnMeta } from './get_data_view_field_or_create';

const mockFieldFormats = {
  getDefaultInstance: jest.fn(),
} as any;

describe('getDataViewFieldOrCreateFromColumnMeta', () => {
  describe('when dataView has the field', () => {
    it('should return the field from dataView when types match', () => {
      const dataView = new DataView({
        spec: {
          id: 'test',
          title: 'test-*',
          fields: {
            message: {
              name: 'message',
              type: 'string',
              esTypes: ['text'],
              searchable: true,
              aggregatable: false,
            },
          },
        },
        fieldFormats: mockFieldFormats,
        shortDotsEnable: false,
        metaFields: [],
      });

      const columnMeta: DatatableColumnMeta = {
        type: 'string', // Same type as in dataView
        esType: 'text',
      };

      const field = getDataViewFieldOrCreateFromColumnMeta({
        dataView,
        fieldName: 'message',
        columnMeta,
      });

      // Should return the field from dataView since types match
      expect(field).toBeDefined();
      expect(field?.name).toBe('message');
      expect(field?.type).toBe('string');
      expect(field?.esTypes).toEqual(['text']);
    });

    it('should create a new field if dataView field has different type than columnMeta', () => {
      const dataView = new DataView({
        spec: {
          id: 'test',
          title: 'test-*',
          fields: {
            count: {
              name: 'count',
              type: 'string', // Wrong type
              esTypes: ['keyword'],
              searchable: true,
              aggregatable: true,
            },
          },
        },
        fieldFormats: mockFieldFormats,
        shortDotsEnable: false,
        metaFields: [],
      });

      const columnMeta: DatatableColumnMeta = {
        type: 'number', // Correct type from ES|QL
        esType: 'long',
      };

      const field = getDataViewFieldOrCreateFromColumnMeta({
        dataView,
        fieldName: 'count',
        columnMeta,
      });

      // Should create a new field from columnMeta because types don't match
      expect(field).toBeDefined();
      expect(field?.name).toBe('count');
      expect(field?.type).toBe('number'); // From columnMeta
      expect(field?.esTypes).toEqual(['long']); // From columnMeta
    });
  });

  describe('when dataView does not have the field', () => {
    it('should create a field from columnMeta when field is missing', () => {
      const dataView = new DataView({
        spec: {
          id: 'test',
          title: 'test-*',
          fields: {},
        },
        fieldFormats: mockFieldFormats,
        shortDotsEnable: false,
        metaFields: [],
      });

      const columnMeta: DatatableColumnMeta = {
        type: 'number',
        esType: 'long',
      };

      const field = getDataViewFieldOrCreateFromColumnMeta({
        dataView,
        fieldName: 'computed_field',
        columnMeta,
      });

      expect(field).toBeDefined();
      expect(field?.name).toBe('computed_field');
      expect(field?.type).toBe('number');
      expect(field?.esTypes).toEqual(['long']);
    });

    it('should return undefined when field is missing and no columnMeta provided', () => {
      const dataView = new DataView({
        spec: {
          id: 'test',
          title: 'test-*',
          fields: {},
        },
        fieldFormats: mockFieldFormats,
        shortDotsEnable: false,
        metaFields: [],
      });

      const field = getDataViewFieldOrCreateFromColumnMeta({
        dataView,
        fieldName: 'missing_field',
        columnMeta: undefined,
      });

      expect(field).toBeUndefined();
    });
  });

  describe('ES|QL enriched DataView scenario', () => {
    it('should use fields from enriched dataView without needing columnMeta', () => {
      // Simulate an enriched ES|QL DataView that has fields from query columns
      const enrichedDataView = new DataView({
        spec: {
          id: 'test',
          title: 'test-*',
          fields: {
            message: {
              name: 'message',
              type: 'string',
              esTypes: ['keyword'],
              searchable: true,
              aggregatable: false,
              isComputedColumn: true, // From ES|QL
            },
            avg_bytes: {
              name: 'avg_bytes',
              type: 'number',
              esTypes: ['double'],
              searchable: true,
              aggregatable: false,
              isComputedColumn: true, // From ES|QL aggregation
            },
          },
        },
        fieldFormats: mockFieldFormats,
        shortDotsEnable: false,
        metaFields: [],
      });

      // When using enriched DataView, columnsMeta is not needed
      const messageField = getDataViewFieldOrCreateFromColumnMeta({
        dataView: enrichedDataView,
        fieldName: 'message',
        columnMeta: undefined, // No columnMeta needed!
      });

      const avgBytesField = getDataViewFieldOrCreateFromColumnMeta({
        dataView: enrichedDataView,
        fieldName: 'avg_bytes',
        columnMeta: undefined, // No columnMeta needed!
      });

      expect(messageField).toBeDefined();
      expect(messageField?.name).toBe('message');
      expect(messageField?.type).toBe('string');
      expect(messageField?.spec.isComputedColumn).toBe(true);

      expect(avgBytesField).toBeDefined();
      expect(avgBytesField?.name).toBe('avg_bytes');
      expect(avgBytesField?.type).toBe('number');
      expect(avgBytesField?.spec.isComputedColumn).toBe(true);
    });
  });
});
