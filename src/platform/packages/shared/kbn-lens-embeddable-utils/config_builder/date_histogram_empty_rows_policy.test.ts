/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DateHistogramIndexPatternColumn } from '@kbn/lens-common';
import { PARTITION_CHART_TYPES, SeriesTypes } from '@kbn/lens-common';
import { applyDateHistogramEmptyRowsPolicyToDatasourceStates } from './date_histogram_empty_rows_policy';

const createDatasourceStates = (
  includeEmptyRows?: boolean
): {
  formBased: {
    layers: {
      layer1: {
        columns: {
          x: DateHistogramIndexPatternColumn;
        };
      };
    };
  };
} => ({
  formBased: {
    layers: {
      layer1: {
        columns: {
          x: {
            dataType: 'date',
            isBucketed: true,
            label: '@timestamp',
            operationType: 'date_histogram',
            params: {
              interval: 'auto',
              ...(includeEmptyRows === undefined ? {} : { includeEmptyRows }),
            },
            scale: 'interval',
            sourceField: '@timestamp',
          } as DateHistogramIndexPatternColumn,
        },
      },
    },
  },
});

describe('config builder empty rows policy', () => {
  it('preserves explicit empty rows values for bar charts', () => {
    const datasourceStates = createDatasourceStates(true);

    const result = applyDateHistogramEmptyRowsPolicyToDatasourceStates(datasourceStates, 'lnsXY', {
      preferredSeriesType: SeriesTypes.BAR,
    });

    expect(result).toBe(datasourceStates);
  });

  it('defaults empty rows off for bar charts when the param is unset', () => {
    const datasourceStates = createDatasourceStates();

    const result = applyDateHistogramEmptyRowsPolicyToDatasourceStates(datasourceStates, 'lnsXY', {
      preferredSeriesType: SeriesTypes.BAR,
    });

    expect(result.formBased.layers.layer1.columns.x.params).toHaveProperty(
      'includeEmptyRows',
      false
    );
  });

  it('preserves explicit empty rows values for pie charts', () => {
    const datasourceStates = createDatasourceStates(true);

    const result = applyDateHistogramEmptyRowsPolicyToDatasourceStates(datasourceStates, 'lnsPie', {
      shape: PARTITION_CHART_TYPES.PIE,
    });

    expect(result).toBe(datasourceStates);
  });

  it('defaults empty rows off for tag cloud charts', () => {
    const datasourceStates = createDatasourceStates();

    const result = applyDateHistogramEmptyRowsPolicyToDatasourceStates(
      datasourceStates,
      'lnsTagcloud',
      {}
    );

    expect(result.formBased.layers.layer1.columns.x.params).toHaveProperty(
      'includeEmptyRows',
      false
    );
  });

  it('keeps empty rows on for tables', () => {
    const datasourceStates = createDatasourceStates();

    const result = applyDateHistogramEmptyRowsPolicyToDatasourceStates(
      datasourceStates,
      'lnsDatatable',
      {}
    );

    expect(result.formBased.layers.layer1.columns.x.params).toHaveProperty(
      'includeEmptyRows',
      true
    );
  });
});
