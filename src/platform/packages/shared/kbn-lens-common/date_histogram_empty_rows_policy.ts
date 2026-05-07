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

const XY_VISUALIZATION_ID = 'lnsXY';
const PARTITION_VISUALIZATION_ID = 'lnsPie';
const TAGCLOUD_VISUALIZATION_ID = 'lnsTagcloud';

interface StateWithPreferredSeriesType {
  preferredSeriesType?: unknown;
}

interface StateWithShape {
  shape?: unknown;
}

export interface DateHistogramEmptyRowsPolicy {
  defaultValue: boolean;
}

const DEFAULT_OFF_POLICY: DateHistogramEmptyRowsPolicy = {
  defaultValue: false,
};

const DEFAULT_ON_POLICY: DateHistogramEmptyRowsPolicy = {
  defaultValue: true,
};

const XY_BAR_SERIES_TYPES = new Set<string>([
  SeriesTypes.BAR,
  SeriesTypes.BAR_STACKED,
  SeriesTypes.BAR_PERCENTAGE_STACKED,
  SeriesTypes.BAR_HORIZONTAL,
  SeriesTypes.BAR_HORIZONTAL_STACKED,
  SeriesTypes.BAR_HORIZONTAL_PERCENTAGE_STACKED,
]);

const PARTITION_DEFAULT_OFF_SHAPES = new Set<string>([
  PARTITION_CHART_TYPES.PIE,
  PARTITION_CHART_TYPES.DONUT,
  PARTITION_CHART_TYPES.TREEMAP,
  PARTITION_CHART_TYPES.WAFFLE,
  PARTITION_CHART_TYPES.MOSAIC,
]);

const getXYSeriesTypeFromState = (visualizationState: unknown) => {
  if (!visualizationState || typeof visualizationState !== 'object') {
    return;
  }

  const { preferredSeriesType } = visualizationState as StateWithPreferredSeriesType;
  return typeof preferredSeriesType === 'string' ? preferredSeriesType : undefined;
};

const getPartitionShapeFromState = (visualizationState: unknown) => {
  if (!visualizationState || typeof visualizationState !== 'object') {
    return;
  }

  const { shape } = visualizationState as StateWithShape;
  return typeof shape === 'string' ? shape : undefined;
};

export const getDateHistogramEmptyRowsPolicy = (
  visualizationType: string | null | undefined,
  subVisualizationId?: string | null
) => {
  switch (visualizationType) {
    case XY_VISUALIZATION_ID:
      if (subVisualizationId && XY_BAR_SERIES_TYPES.has(subVisualizationId)) {
        return DEFAULT_OFF_POLICY;
      }

      return;

    case PARTITION_VISUALIZATION_ID:
      if (subVisualizationId && PARTITION_DEFAULT_OFF_SHAPES.has(subVisualizationId)) {
        return DEFAULT_OFF_POLICY;
      }

      return;

    case LENS_HEATMAP_ID:
      return DEFAULT_OFF_POLICY;

    case LENS_METRIC_ID:
    case TAGCLOUD_VISUALIZATION_ID:
      return DEFAULT_OFF_POLICY;

    case LENS_DATATABLE_ID:
      return DEFAULT_ON_POLICY;

    default:
      return;
  }
};

export const getDateHistogramEmptyRowsPolicyForVisualizationState = (
  visualizationType: string | null | undefined,
  visualizationState: unknown
) => {
  if (visualizationType === XY_VISUALIZATION_ID) {
    return getDateHistogramEmptyRowsPolicy(
      visualizationType,
      getXYSeriesTypeFromState(visualizationState)
    );
  }

  if (visualizationType === PARTITION_VISUALIZATION_ID) {
    return getDateHistogramEmptyRowsPolicy(
      visualizationType,
      getPartitionShapeFromState(visualizationState)
    );
  }

  return getDateHistogramEmptyRowsPolicy(visualizationType);
};
