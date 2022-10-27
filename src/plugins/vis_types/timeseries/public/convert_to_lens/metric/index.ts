/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import uuid from 'uuid';
import { DataView, parseTimeShift } from '@kbn/data-plugin/common';
import { getIndexPatternIds } from '@kbn/visualizations-plugin/common/convert_to_lens';
import { PANEL_TYPES } from '../../../common/enums';
import { getDataViewsStart } from '../../services';
import { getDataSourceInfo } from '../lib/datasource';
import { getMetricsColumns, getBucketsColumns } from '../lib/series';
import { getConfigurationForMetric as getConfiguration } from '../lib/configurations/metric';
import { getReducedTimeRange, isValidMetrics } from '../lib/metrics';
import { ConvertTsvbToLensVisualization } from '../types';
import { ColumnsWithoutMeta, Layer as ExtendedLayer } from '../lib/convert';
import { excludeMetaFromLayers, getUniqueBuckets } from '../utils';

const MAX_SERIES = 2;
const MAX_BUCKETS = 2;

export const convertToLens: ConvertTsvbToLensVisualization = async (model, timeRange) => {
  const dataViews = getDataViewsStart();
  const seriesNum = model.series.filter((series) => !series.hidden).length;

  const indexPatternIds = new Set();
  // we should get max only 2 series
  const visibleSeries = model.series.filter(({ hidden }) => !hidden).slice(0, 2);
  let currentIndexPattern: DataView | null = null;
  for (const series of visibleSeries) {
    const datasourceInfo = await getDataSourceInfo(
      model.index_pattern,
      model.time_field,
      Boolean(series.override_index_pattern),
      series.series_index_pattern,
      series.series_time_field,
      dataViews
    );

    if (!datasourceInfo) {
      return null;
    }

    const { indexPatternId, indexPattern } = datasourceInfo;
    indexPatternIds.add(indexPatternId);
    currentIndexPattern = indexPattern;
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

    const reducedTimeRange = getReducedTimeRange(model, series, timeRange);

    // handle multiple metrics
    const metricsColumns = getMetricsColumns(series, currentIndexPattern!, seriesNum, {
      reducedTimeRange,
    });
    if (metricsColumns === null) {
      return null;
    }

    const bucketsColumns = getBucketsColumns(
      model,
      series,
      metricsColumns,
      currentIndexPattern!,
      false
    );

    if (bucketsColumns === null) {
      return null;
    }

    buckets.push(...bucketsColumns);
    metrics.push(...metricsColumns);
  }

  let uniqueBuckets = buckets;
  if (visibleSeries.length === MAX_SERIES && buckets.length) {
    if (buckets.length !== MAX_BUCKETS) {
      return null;
    }

    uniqueBuckets = getUniqueBuckets(buckets as ColumnsWithoutMeta[]);
    if (uniqueBuckets.length !== 1) {
      return null;
    }
  }

  const [bucket] = uniqueBuckets;

  const extendedLayer: ExtendedLayer = {
    indexPatternId: indexPatternId as string,
    layerId: uuid(),
    columns: [...metrics, ...(bucket ? [bucket] : [])],
    columnOrder: [],
  };

  const configuration = getConfiguration(model, extendedLayer, bucket);
  if (!configuration) {
    return null;
  }

  const layers = Object.values(excludeMetaFromLayers({ 0: extendedLayer }));
  return {
    type: 'lnsMetric',
    layers,
    configuration,
    indexPatternIds: getIndexPatternIds(layers),
  };
};
