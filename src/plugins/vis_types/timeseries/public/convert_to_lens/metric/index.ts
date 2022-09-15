/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import uuid from 'uuid';
import { parseTimeShift } from '@kbn/data-plugin/common';
import { PANEL_TYPES } from '../../../common/enums';
import { getDataViewsStart } from '../../services';
import { getDataSourceInfo } from '../lib/datasource';
import { getMetricsColumns, getBucketsColumns } from '../lib/series';
import { getConfigurationForMetric as getConfiguration } from '../lib/configurations/metric';
import { getReducedTimeRange, isValidMetrics } from '../lib/metrics';
import { ConvertTsvbToLensVisualization } from '../types';
import { Layer as ExtendedLayer } from '../lib/convert';
import { excludeMetaFromLayers } from './utils';

export const convertToLens: ConvertTsvbToLensVisualization = async (model, timeRange) => {
  const dataViews = getDataViewsStart();
  const seriesNum = model.series.filter((series) => !series.hidden).length;

  const indexPatternIds = new Set();
  const visibleSeries = model.series.filter(({ hidden }) => !hidden);
  for (const series of visibleSeries) {
    const { indexPatternId } = await getDataSourceInfo(
      model.index_pattern,
      model.time_field,
      Boolean(series.override_index_pattern),
      series.series_index_pattern,
      series.series_time_field,
      dataViews
    );
    indexPatternIds.add(indexPatternId);
  }

  if (indexPatternIds.size > 1) {
    return null;
  }

  const [indexPatternId] = indexPatternIds.values();

  const buckets = [];
  const metrics = [];

  // handle multiple layers/series
  for (const series of visibleSeries) {
    // not valid time shift
    if (series.offset_time && parseTimeShift(series.offset_time) === 'invalid') {
      return null;
    }

    if (!isValidMetrics(series.metrics, PANEL_TYPES.METRIC, series.time_range_mode)) {
      return null;
    }

    const { indexPattern } = await getDataSourceInfo(
      model.index_pattern,
      model.time_field,
      Boolean(series.override_index_pattern),
      series.series_index_pattern,
      series.series_time_field,
      dataViews
    );

    const reducedTimeRange = getReducedTimeRange(model, series, timeRange);

    // handle multiple metrics
    const metricsColumns = getMetricsColumns(series, indexPattern!, seriesNum, reducedTimeRange);
    if (!metricsColumns) {
      return null;
    }

    const bucketsColumns = getBucketsColumns(model, series, metricsColumns, indexPattern!, false);
    if (bucketsColumns === null) {
      return null;
    }

    buckets.push(...bucketsColumns);
    if (buckets.length > 1) {
      return null;
    }

    metrics.push(...metricsColumns);
  }

  const extendedLayer: ExtendedLayer = {
    indexPatternId: indexPatternId as string,
    layerId: uuid(),
    columns: [...metrics, ...buckets],
    columnOrder: [],
  };

  const configuration = getConfiguration(model, extendedLayer, buckets[0]);
  if (!configuration) {
    return null;
  }

  return {
    type: 'lnsMetric',
    layers: Object.values(excludeMetaFromLayers({ 0: extendedLayer })),
    configuration,
  };
};
