/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { LENS_DATATABLE_ID } from './visualizations/datatable/constants';
import { LENS_HEATMAP_ID } from './visualizations/heatmap/constants';
import { LENS_METRIC_ID } from './visualizations/metric/constants';
import { PARTITION_CHART_TYPES } from './visualizations/partition/constants';
import { SeriesTypes } from './visualizations/xy/constants';
import {
  getDateHistogramEmptyRowsPolicy,
  getDateHistogramEmptyRowsPolicyForVisualizationState,
} from './date_histogram_empty_rows_policy';

describe('date histogram empty rows policy', () => {
  it('defaults empty rows off for bar subtypes', () => {
    expect(getDateHistogramEmptyRowsPolicy('lnsXY', SeriesTypes.BAR_HORIZONTAL_STACKED)).toEqual({
      defaultValue: false,
    });
  });

  it('does not override line and area defaults in this issue scope', () => {
    expect(
      getDateHistogramEmptyRowsPolicy('lnsXY', SeriesTypes.AREA_PERCENTAGE_STACKED)
    ).toBeUndefined();
    expect(getDateHistogramEmptyRowsPolicy('lnsXY', SeriesTypes.LINE)).toBeUndefined();
  });

  it('defaults empty rows off for the supported partition chart shapes', () => {
    expect(getDateHistogramEmptyRowsPolicy('lnsPie', PARTITION_CHART_TYPES.DONUT)).toEqual({
      defaultValue: false,
    });
    expect(getDateHistogramEmptyRowsPolicy('lnsPie', PARTITION_CHART_TYPES.TREEMAP)).toEqual({
      defaultValue: false,
    });
    expect(getDateHistogramEmptyRowsPolicy('lnsPie', PARTITION_CHART_TYPES.WAFFLE)).toEqual({
      defaultValue: false,
    });
  });

  it('defaults empty rows off for metric-style visualizations', () => {
    expect(getDateHistogramEmptyRowsPolicy(LENS_METRIC_ID)).toEqual({
      defaultValue: false,
    });
    expect(getDateHistogramEmptyRowsPolicy('lnsTagcloud')).toEqual({
      defaultValue: false,
    });
  });

  it('keeps empty rows on by default for tables', () => {
    expect(getDateHistogramEmptyRowsPolicy(LENS_DATATABLE_ID)).toEqual({
      defaultValue: true,
    });
  });

  it('derives the XY subtype from persisted visualization state', () => {
    expect(
      getDateHistogramEmptyRowsPolicyForVisualizationState('lnsXY', {
        preferredSeriesType: SeriesTypes.BAR_PERCENTAGE_STACKED,
      })
    ).toEqual({
      defaultValue: false,
    });
  });

  it('derives the partition shape from persisted visualization state', () => {
    expect(
      getDateHistogramEmptyRowsPolicyForVisualizationState('lnsPie', {
        shape: PARTITION_CHART_TYPES.WAFFLE,
      })
    ).toEqual({
      defaultValue: false,
    });
  });

  it('returns the heatmap policy without needing a subtype', () => {
    expect(getDateHistogramEmptyRowsPolicyForVisualizationState(LENS_HEATMAP_ID, {})).toEqual({
      defaultValue: false,
    });
  });
});
