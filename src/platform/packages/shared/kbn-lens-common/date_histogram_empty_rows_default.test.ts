/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DateHistogramIndexPatternColumn } from './datasources/operations';
import { LENS_DATATABLE_ID } from './visualizations/datatable/constants';
import { LENS_HEATMAP_ID } from './visualizations/heatmap/constants';
import { LENS_METRIC_ID } from './visualizations/metric/constants';
import { PARTITION_CHART_TYPES } from './visualizations/partition/constants';
import { SeriesTypes } from './visualizations/xy/constants';
import {
  applyEmptyRowsDefaultToDatasourceState,
  applyEmptyRowsDefaultToDatasourceStates,
  getEmptyRowsDefault,
  getEmptyRowsDefaultForVisualizationState,
} from './date_histogram_empty_rows_default';

const createDateHistogramColumn = (
  includeEmptyRows?: boolean
): DateHistogramIndexPatternColumn => ({
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
});

const createDatasourceState = (includeEmptyRows?: boolean) => ({
  layers: {
    layer1: {
      columns: {
        date: createDateHistogramColumn(includeEmptyRows),
      },
    },
  },
});

const createDatasourceStates = (includeEmptyRows?: boolean) => ({
  formBased: createDatasourceState(includeEmptyRows),
});

describe('date histogram empty rows default', () => {
  it('defaults empty rows off for bar subtypes', () => {
    expect(getEmptyRowsDefault('lnsXY', SeriesTypes.BAR_HORIZONTAL_STACKED)).toBe(false);
  });

  it('returns no visualization default for non-bar XY series', () => {
    expect(getEmptyRowsDefault('lnsXY', SeriesTypes.AREA_PERCENTAGE_STACKED)).toBeUndefined();
    expect(getEmptyRowsDefault('lnsXY', SeriesTypes.LINE)).toBeUndefined();
  });

  it('defaults empty rows off for the supported partition chart shapes', () => {
    expect(getEmptyRowsDefault('lnsPie', PARTITION_CHART_TYPES.DONUT)).toBe(false);
    expect(getEmptyRowsDefault('lnsPie', PARTITION_CHART_TYPES.TREEMAP)).toBe(false);
    expect(getEmptyRowsDefault('lnsPie', PARTITION_CHART_TYPES.WAFFLE)).toBe(false);
  });

  it('defaults empty rows off for metric-style visualizations', () => {
    expect(getEmptyRowsDefault(LENS_METRIC_ID)).toBe(false);
    expect(getEmptyRowsDefault('lnsTagcloud')).toBe(false);
  });

  it('keeps empty rows on by default for tables', () => {
    expect(getEmptyRowsDefault(LENS_DATATABLE_ID)).toBe(true);
  });

  it('derives the XY subtype from persisted visualization state', () => {
    expect(
      getEmptyRowsDefaultForVisualizationState('lnsXY', {
        preferredSeriesType: SeriesTypes.BAR_PERCENTAGE_STACKED,
      })
    ).toBe(false);
  });

  it('derives the partition shape from persisted visualization state', () => {
    expect(
      getEmptyRowsDefaultForVisualizationState('lnsPie', {
        shape: PARTITION_CHART_TYPES.WAFFLE,
      })
    ).toBe(false);
  });

  it('returns the heatmap default without needing a subtype', () => {
    expect(getEmptyRowsDefaultForVisualizationState(LENS_HEATMAP_ID, {})).toBe(false);
  });
});

describe('applying date histogram empty rows defaults', () => {
  it('preserves explicit empty rows values for runtime datasource state', () => {
    const datasourceState = createDatasourceState(true);

    expect(
      applyEmptyRowsDefaultToDatasourceState(datasourceState, 'lnsXY', {
        preferredSeriesType: SeriesTypes.BAR,
      })
    ).toBe(datasourceState);
  });

  it('defaults empty rows off for runtime datasource state when the value is missing', () => {
    const datasourceState = createDatasourceState();

    expect(
      applyEmptyRowsDefaultToDatasourceState(datasourceState, 'lnsXY', {
        preferredSeriesType: SeriesTypes.BAR,
      })
    ).toEqual({
      layers: {
        layer1: {
          columns: {
            date: createDateHistogramColumn(false),
          },
        },
      },
    });
  });

  it('can overwrite existing runtime values with the target visualization default', () => {
    const datasourceState = createDatasourceState(true);

    expect(
      applyEmptyRowsDefaultToDatasourceState(
        datasourceState,
        'lnsXY',
        {
          preferredSeriesType: SeriesTypes.BAR,
        },
        { overwriteExisting: true }
      )
    ).toEqual({
      layers: {
        layer1: {
          columns: {
            date: createDateHistogramColumn(false),
          },
        },
      },
    });
  });

  it('preserves explicit empty rows values for config-builder datasource states', () => {
    const datasourceStates = createDatasourceStates(true);

    expect(
      applyEmptyRowsDefaultToDatasourceStates(datasourceStates, 'lnsPie', {
        shape: PARTITION_CHART_TYPES.PIE,
      })
    ).toBe(datasourceStates);
  });

  it('defaults empty rows on for config-builder datasource states when the value is missing', () => {
    const datasourceStates = createDatasourceStates();

    expect(applyEmptyRowsDefaultToDatasourceStates(datasourceStates, 'lnsDatatable', {})).toEqual({
      formBased: {
        layers: {
          layer1: {
            columns: {
              date: createDateHistogramColumn(true),
            },
          },
        },
      },
    });
  });

  it('can overwrite existing datasource states with the target visualization default', () => {
    const datasourceStates = createDatasourceStates(false);

    expect(
      applyEmptyRowsDefaultToDatasourceStates(
        datasourceStates,
        'lnsDatatable',
        {},
        { overwriteExisting: true }
      )
    ).toEqual({
      formBased: {
        layers: {
          layer1: {
            columns: {
              date: createDateHistogramColumn(true),
            },
          },
        },
      },
    });
  });

  it('leaves unsupported runtime datasource state unchanged', () => {
    expect(applyEmptyRowsDefaultToDatasourceState('text based state', 'lnsMetric', {})).toBe(
      'text based state'
    );
  });
});
