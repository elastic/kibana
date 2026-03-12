/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DatatableColumnType } from '@kbn/expressions-plugin/common';
import {
  convertDatatableColumnToDataViewFieldSpec,
  convertDatatableColumnsToFieldSpecs,
} from './convert_to_data_view_field_spec';

describe('convertDatatableColumnToDataViewFieldSpec', () => {
  it('should return a DataViewField object for a counter column', () => {
    const column = {
      id: 'bytes_counter',
      name: 'bytes_counter',
      meta: {
        esType: 'counter_long',
        type: 'number' as DatatableColumnType,
      },
      isNull: false,
      isComputedColumn: true,
    };
    const result = convertDatatableColumnToDataViewFieldSpec(column);
    expect(result).toEqual(
      expect.objectContaining({
        name: 'bytes_counter',
        type: 'number',
        esTypes: ['long'],
        searchable: true,
        aggregatable: false,
        isNull: false,
        isComputedColumn: true,
        timeSeriesMetric: 'counter',
      })
    );
  });

  it('should return a DataViewField object with timeSeriesMetric undefined if esType does not start with counter_', () => {
    const column = {
      id: 'test',
      name: 'test',
      meta: {
        esType: 'keyword',
        type: 'string' as DatatableColumnType,
      },
      isNull: false,
      isComputedColumn: false,
    };
    const result = convertDatatableColumnToDataViewFieldSpec(column);
    expect(result.timeSeriesMetric).toBeUndefined();
    expect(result).toEqual(
      expect.objectContaining({
        name: 'test',
        type: 'string',
        esTypes: ['keyword'],
        searchable: true,
        aggregatable: false,
        isNull: false,
        isComputedColumn: false,
      })
    );
  });

  it('should set isComputedColumn to true when column is a computed column', () => {
    const column = {
      id: 'computed_col',
      name: 'computed_col',
      meta: {
        esType: 'long',
        type: 'number' as DatatableColumnType,
      },
      isNull: false,
      isComputedColumn: true,
    };
    const result = convertDatatableColumnToDataViewFieldSpec(column);
    expect(result.isComputedColumn).toBe(true);
  });

  it('should set isComputedColumn to false when column is from the index', () => {
    const column = {
      id: 'index_field',
      name: 'index_field',
      meta: {
        esType: 'keyword',
        type: 'string' as DatatableColumnType,
      },
      isNull: false,
      isComputedColumn: false,
    };
    const result = convertDatatableColumnToDataViewFieldSpec(column);
    expect(result.isComputedColumn).toBe(false);
  });

  it('should default isComputedColumn to false when not specified', () => {
    const column = {
      id: 'legacy_col',
      name: 'legacy_col',
      meta: {
        esType: 'keyword',
        type: 'string' as DatatableColumnType,
      },
      isNull: false,
    };
    const result = convertDatatableColumnToDataViewFieldSpec(column);
    expect(result.isComputedColumn).toBe(false);
  });
});

describe('convertDatatableColumnsToFieldSpecs', () => {
  it('should convert multiple columns to a record of field specs', () => {
    const columns = [
      {
        id: 'field1',
        name: 'field1',
        meta: {
          esType: 'keyword',
          type: 'string' as DatatableColumnType,
        },
      },
      {
        id: 'field2',
        name: 'field2',
        meta: {
          esType: 'long',
          type: 'number' as DatatableColumnType,
        },
      },
    ];
    const result = convertDatatableColumnsToFieldSpecs(columns);
    
    expect(result).toEqual({
      field1: expect.objectContaining({
        name: 'field1',
        type: 'string',
        esTypes: ['keyword'],
      }),
      field2: expect.objectContaining({
        name: 'field2',
        type: 'number',
        esTypes: ['long'],
      }),
    });
  });

  it('should return an empty record for an empty array', () => {
    const result = convertDatatableColumnsToFieldSpecs([]);
    expect(result).toEqual({});
  });

  it('should handle columns with same name (last one wins)', () => {
    const columns = [
      {
        id: 'field1',
        name: 'duplicate',
        meta: {
          esType: 'keyword',
          type: 'string' as DatatableColumnType,
        },
      },
      {
        id: 'field2',
        name: 'duplicate',
        meta: {
          esType: 'long',
          type: 'number' as DatatableColumnType,
        },
      },
    ];
    const result = convertDatatableColumnsToFieldSpecs(columns);
    
    expect(Object.keys(result)).toHaveLength(1);
    expect(result.duplicate.type).toBe('number');
  });
});
