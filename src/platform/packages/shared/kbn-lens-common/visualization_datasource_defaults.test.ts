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
  applyDatasourceDefaultsToColumnParams,
  applyDatasourceDefaultsToDatasourceState,
  applyDatasourceDefaultsToDatasourceStates,
  getVisualizationDatasourceDefaults,
  getVisualizationDatasourceDefaultsForVisualizationState,
} from './visualization_datasource_defaults';

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

describe('visualization datasource defaults', () => {
  it('defaults date histogram empty rows off for bar subtypes', () => {
    expect(getVisualizationDatasourceDefaults('lnsXY', SeriesTypes.BAR_HORIZONTAL_STACKED)).toEqual(
      {
        operationParams: {
          date_histogram: {
            includeEmptyRows: false,
          },
        },
      }
    );
  });

  it('returns no visualization defaults for non-bar XY series', () => {
    expect(
      getVisualizationDatasourceDefaults('lnsXY', SeriesTypes.AREA_PERCENTAGE_STACKED)
    ).toBeUndefined();
    expect(getVisualizationDatasourceDefaults('lnsXY', SeriesTypes.LINE)).toBeUndefined();
  });

  it('defaults date histogram empty rows off for the supported partition chart shapes', () => {
    expect(getVisualizationDatasourceDefaults('lnsPie', PARTITION_CHART_TYPES.DONUT)).toEqual({
      operationParams: {
        date_histogram: {
          includeEmptyRows: false,
        },
      },
    });
    expect(getVisualizationDatasourceDefaults('lnsPie', PARTITION_CHART_TYPES.TREEMAP)).toEqual({
      operationParams: {
        date_histogram: {
          includeEmptyRows: false,
        },
      },
    });
    expect(getVisualizationDatasourceDefaults('lnsPie', PARTITION_CHART_TYPES.WAFFLE)).toEqual({
      operationParams: {
        date_histogram: {
          includeEmptyRows: false,
        },
      },
    });
  });

  it('defaults date histogram empty rows off for metric-style visualizations', () => {
    expect(getVisualizationDatasourceDefaults(LENS_METRIC_ID)).toEqual({
      operationParams: {
        date_histogram: {
          includeEmptyRows: false,
        },
      },
    });
    expect(getVisualizationDatasourceDefaults('lnsTagcloud')).toEqual({
      operationParams: {
        date_histogram: {
          includeEmptyRows: false,
        },
      },
    });
  });

  it('keeps date histogram empty rows on by default for tables', () => {
    expect(getVisualizationDatasourceDefaults(LENS_DATATABLE_ID)).toEqual({
      operationParams: {
        date_histogram: {
          includeEmptyRows: true,
        },
      },
    });
  });

  it('derives the XY subtype from persisted visualization state', () => {
    expect(
      getVisualizationDatasourceDefaultsForVisualizationState('lnsXY', {
        preferredSeriesType: SeriesTypes.BAR_PERCENTAGE_STACKED,
      })
    ).toEqual({
      operationParams: {
        date_histogram: {
          includeEmptyRows: false,
        },
      },
    });
  });

  it('derives the partition shape from persisted visualization state', () => {
    expect(
      getVisualizationDatasourceDefaultsForVisualizationState('lnsPie', {
        shape: PARTITION_CHART_TYPES.WAFFLE,
      })
    ).toEqual({
      operationParams: {
        date_histogram: {
          includeEmptyRows: false,
        },
      },
    });
  });

  it('returns the heatmap defaults without needing a subtype', () => {
    expect(getVisualizationDatasourceDefaultsForVisualizationState(LENS_HEATMAP_ID, {})).toEqual({
      operationParams: {
        date_histogram: {
          includeEmptyRows: false,
        },
      },
    });
  });
});

describe('applying visualization datasource defaults', () => {
  it('applies missing defaults while creating date histogram params', () => {
    expect(
      applyDatasourceDefaultsToColumnParams(
        'date_histogram',
        undefined,
        getVisualizationDatasourceDefaults('lnsXY', SeriesTypes.BAR)
      )
    ).toEqual({ includeEmptyRows: false });
  });

  it('preserves explicit params while creating date histogram params by default', () => {
    expect(
      applyDatasourceDefaultsToColumnParams(
        'date_histogram',
        { includeEmptyRows: true },
        getVisualizationDatasourceDefaults('lnsXY', SeriesTypes.BAR)
      )
    ).toEqual({ includeEmptyRows: true });
  });

  it('preserves explicit datasource values for runtime state', () => {
    const datasourceState = createDatasourceState(true);

    expect(
      applyDatasourceDefaultsToDatasourceState(
        datasourceState,
        getVisualizationDatasourceDefaults('lnsXY', SeriesTypes.BAR)
      )
    ).toBe(datasourceState);
  });

  it('defaults missing datasource values for runtime state', () => {
    const datasourceState = createDatasourceState();

    expect(
      applyDatasourceDefaultsToDatasourceState(
        datasourceState,
        getVisualizationDatasourceDefaults('lnsXY', SeriesTypes.BAR)
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

  it('can overwrite existing runtime values with visualization defaults', () => {
    const datasourceState = createDatasourceState(true);

    expect(
      applyDatasourceDefaultsToDatasourceState(
        datasourceState,
        getVisualizationDatasourceDefaults('lnsXY', SeriesTypes.BAR),
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

  it('preserves explicit datasource values for datasource states', () => {
    const datasourceStates = createDatasourceStates(true);

    expect(
      applyDatasourceDefaultsToDatasourceStates(
        datasourceStates,
        getVisualizationDatasourceDefaults('lnsPie', PARTITION_CHART_TYPES.PIE)
      )
    ).toBe(datasourceStates);
  });

  it('defaults missing datasource values for datasource states', () => {
    const datasourceStates = createDatasourceStates();

    expect(
      applyDatasourceDefaultsToDatasourceStates(
        datasourceStates,
        getVisualizationDatasourceDefaults('lnsDatatable')
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

  it('can overwrite existing datasource states with visualization defaults', () => {
    const datasourceStates = createDatasourceStates(false);

    expect(
      applyDatasourceDefaultsToDatasourceStates(
        datasourceStates,
        getVisualizationDatasourceDefaults('lnsDatatable'),
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
    expect(
      applyDatasourceDefaultsToDatasourceState(
        'text based state',
        getVisualizationDatasourceDefaults('lnsMetric')
      )
    ).toBe('text based state');
  });
});
