/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { METRIC_TYPES } from '@kbn/data-plugin/public';
import { CollapseFunction, Column } from '@kbn/visualizations-plugin/common';
import {
  getConvertToLensModule,
  getVisSchemas,
  getDataViewByIndexPatternId,
} from '@kbn/visualizations-plugin/public';
import { excludeMetaFromColumn } from '@kbn/visualizations-plugin/common/convert_to_lens';
import { getDataViewsStart } from '../services';
import { getSeriesParams } from '../utils/get_series_params';
import { ConvertXYToLensVisualization } from './types';
import { getConfiguration } from './configurations';

export interface Layer {
  indexPatternId: string;
  layerId: string;
  columns: Column[];
  metrics: string[];
  columnOrder: never[];
  seriesIdsMap: Record<string, string>;
  isReferenceLineLayer: boolean;
  collapseFn?: CollapseFunction;
  ignoreGlobalFilters: boolean;
}

const SIBBLING_PIPELINE_AGGS: string[] = [
  METRIC_TYPES.AVG_BUCKET,
  METRIC_TYPES.SUM_BUCKET,
  METRIC_TYPES.MAX_BUCKET,
  METRIC_TYPES.MIN_BUCKET,
];

export const convertToLens: ConvertXYToLensVisualization = async (vis, timefilter) => {
  if (!timefilter) {
    return null;
  }

  const dataViews = getDataViewsStart();
  const dataView = await getDataViewByIndexPatternId(vis.data.indexPattern?.id, dataViews);

  if (!dataView) {
    return null;
  }

  const visSchemas = getVisSchemas(vis, {
    timefilter,
    timeRange: timefilter.getAbsoluteTime(),
  });

  // doesn't support multi split series
  if (visSchemas.group && visSchemas.group.length > 1) {
    return null;
  }

  const firstValueAxesId = vis.params.valueAxes[0].id;
  const updatedSeries = getSeriesParams(
    vis.data.aggs,
    vis.params.seriesParams,
    'metric',
    firstValueAxesId
  );

  const finalSeriesParams = updatedSeries ?? vis.params.seriesParams;
  const visibleSeries = finalSeriesParams.filter(
    (param) => param.show && visSchemas.metric.some((m) => m.aggId?.split('.')[0] === param.data.id)
  );

  const { getColumnsFromVis, createStaticValueColumn } = await getConvertToLensModule();
  const dataLayers = getColumnsFromVis(
    vis,
    timefilter,
    dataView,
    {
      buckets: ['segment'],
      splits: ['group'],
      unsupported: ['split_row', 'split_column', 'radius'],
    },
    {
      dropEmptyRowsInDateHistogram: true,
      supportMixedSiblingPipelineAggs: true,
      isPercentageMode: false,
    },
    visibleSeries
      .reduce<Array<{ metrics: string[]; type: string; mode: string }>>((acc, s) => {
        const series = acc.find(({ type, mode }) => type === s.type && mode === s.mode);
        // sibling pipeline agg always generate new layer because of custom bucket
        if (
          series &&
          visSchemas.metric.some(
            (m) =>
              m.aggId?.split('.')[0] === s.data.id && !SIBBLING_PIPELINE_AGGS.includes(m.aggType)
          )
        ) {
          series.metrics.push(s.data.id);
        } else {
          acc.push({ metrics: [s.data.id], type: s.type, mode: s.mode });
        }
        return acc;
      }, [])
      .map(({ metrics }) => ({ metrics }))
  );

  if (dataLayers === null) {
    return null;
  }

  // doesn't support several layers with terms split series which uses one of the metrics as order agg
  if (
    dataLayers.length > 1 &&
    dataLayers.some((l) =>
      l.columns.some(
        (c) => c.isSplit && 'orderBy' in c.params && c.params.orderBy.type === 'column'
      )
    )
  ) {
    return null;
  }

  // doesn't support sibling pipeline aggs and split series together
  if (
    visSchemas.group?.length &&
    dataLayers.some((l) => Object.keys(l.buckets.customBuckets).length)
  ) {
    return null;
  }

  const visibleYAxes = vis.params.valueAxes.filter((axis) =>
    visibleSeries.some((seriesParam) => seriesParam.valueAxis === axis.id)
  );

  const positions = visibleYAxes.map((axis) => axis.position);
  const uniqPoisitions = new Set(positions);

  // doesn't support more than one axis left/right/top/bottom
  if (visibleYAxes.length > 1 && uniqPoisitions.size !== positions.length) {
    return null;
  }

  const indexPatternId = dataView.id!;

  const { v4: uuidv4 } = await import('uuid');

  const layers = dataLayers.map<Layer>((l) => {
    const layerId = uuidv4();
    const seriesIdsMap: Record<string, string> = {};
    visibleSeries.forEach((s) => {
      const column = l.columns.find(
        (c) => !c.isBucketed && c.meta.aggId.split('.')[0] === s.data.id
      );
      if (column) {
        seriesIdsMap[column.columnId] = s.data.id;
      }
    });
    const collapseFn = l.bucketCollapseFn
      ? (Object.keys(l.bucketCollapseFn).find((key) =>
          l.bucketCollapseFn[key as CollapseFunction].includes(
            l.buckets.customBuckets[l.metrics[0]]
          )
        ) as CollapseFunction)
      : undefined;
    return {
      indexPatternId,
      layerId,
      columns: l.columns.map(excludeMetaFromColumn),
      metrics: l.metrics,
      columnOrder: [],
      seriesIdsMap,
      collapseFn,
      isReferenceLineLayer: false,
      ignoreGlobalFilters: false,
    };
  });

  if (vis.params.thresholdLine.show) {
    const staticValueColumn = createStaticValueColumn(vis.params.thresholdLine.value || 0);
    layers.push({
      indexPatternId,
      layerId: uuidv4(),
      columns: [staticValueColumn],
      columnOrder: [],
      metrics: [staticValueColumn.columnId],
      isReferenceLineLayer: true,
      ignoreGlobalFilters: false,
      collapseFn: undefined,
      seriesIdsMap: {},
    });
  }

  return {
    type: 'lnsXY',
    layers: layers.map(({ seriesIdsMap, collapseFn, isReferenceLineLayer, ...rest }) => rest),
    configuration: getConfiguration(layers, visibleSeries, vis),
    indexPatternIds: [indexPatternId],
  };
};
