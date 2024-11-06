/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FieldSpec } from '@kbn/data-views-plugin/common';
import { convertDataViewFieldToDatatableColumn } from './convert_to_data_table_column';

describe('convertDataViewFieldToDatatableColumn', () => {
  it('should return a correct DatatableColumn object for a counter timeseries field', () => {
    const field: FieldSpec = {
      name: 'bytes_counter',
      timeSeriesMetric: 'counter',
      type: 'number',
      esTypes: ['long'],
      searchable: true,
      aggregatable: false,
      isNull: false,
    };
    const result = convertDataViewFieldToDatatableColumn(field);
    expect(result).toEqual(
      expect.objectContaining({
        id: 'bytes_counter',
        name: 'bytes_counter',
        meta: {
          type: 'number',
          esType: 'counter_long',
        },
        isNull: false,
      })
    );
  });

  it('should return a correct DatatableColumn object for a non-counter timeseries field', () => {
    const field: FieldSpec = {
      name: 'bytes',
      timeSeriesMetric: 'summary',
      type: 'number',
      esTypes: ['long'],
      searchable: true,
      aggregatable: false,
      isNull: false,
    };
    const result = convertDataViewFieldToDatatableColumn(field);
    expect(result).toEqual(
      expect.objectContaining({
        id: 'bytes',
        name: 'bytes',
        meta: {
          type: 'number',
          esType: 'long',
        },
        isNull: false,
      })
    );
  });
});
