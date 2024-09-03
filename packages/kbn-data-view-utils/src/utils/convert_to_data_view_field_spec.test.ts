/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DatatableColumnType } from '@kbn/expressions-plugin/common';
import { convertDatatableColumnToDataViewFieldSpec } from './convert_to_data_view_field_spec';

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
      })
    );
  });
});
