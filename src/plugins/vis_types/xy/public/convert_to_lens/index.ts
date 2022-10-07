/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Column, ColumnWithMeta } from '@kbn/visualizations-plugin/common';
import {
  convertToLensModule,
  getVisSchemas,
  getDataViewByIndexPatternId,
} from '@kbn/visualizations-plugin/public';
import uuid from 'uuid';
import { getDataViewsStart } from '../services';
import { getSeriesParams } from '../utils/get_series_params';
import { getConfiguration } from './configurations';
import { ConvertXYToLensVisualization } from './types';

export const isColumnWithMeta = (column: Column): column is ColumnWithMeta => {
  if ((column as ColumnWithMeta).meta) {
    return true;
  }
  return false;
};

export const excludeMetaFromColumn = (column: Column) => {
  if (isColumnWithMeta(column)) {
    const { meta, ...rest } = column;
    return rest;
  }
  return column;
};

export const convertToLens: ConvertXYToLensVisualization = async (vis, timefilter) => {
  if (!timefilter) {
    return null;
  }

  const dataViews = getDataViewsStart();
  const dataView = await getDataViewByIndexPatternId(vis.data.indexPattern?.id, dataViews);

  if (!dataView) {
    return null;
  }

  const { getColumnsFromVis, createStaticValueColumn } = await convertToLensModule;
  const result = getColumnsFromVis(
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
    }
  );

  if (result === null) {
    return null;
  }

  const visSchemas = getVisSchemas(vis, {
    timefilter,
    timeRange: timefilter.getAbsoluteTime(),
  });

  // doesn't support sibling pipeline aggs and split series together
  if (visSchemas.group?.length && Object.keys(result.buckets.customBuckets).length) {
    return null;
  }

  // doesn't support several metrics with terms split series which uses one of the metrics as order agg
  if (
    visSchemas.metric.length > 1 &&
    result.columns.some(
      (c) => c.isSplit && 'orderBy' in c.params && c.params.orderBy.type === 'column'
    )
  ) {
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
    (param) => param.show && visSchemas.metric.some((m) => m.aggId === param.data.id)
  );

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

  const layers = visibleSeries.map((s) => {
    const layerId = uuid();
    const metrics = result.columns.filter((c) => c.meta.aggId === s.data.id);
    const buckets = result.columns.filter((c) => {
      if (c.isBucketed) {
        if (c.isSplit) {
          // as each sibling pipeline agg can have different custom bucket we should get correct one for layer
          if (
            Object.keys(result.buckets.customBuckets).some((key) =>
              result.buckets.customBuckets[key].includes(c.columnId)
            )
          ) {
            return result.buckets.customBuckets[metrics[0].columnId] === c.columnId;
          }
        }

        return true;
      }
    });
    const collapseFn = Object.keys(result.bucketCollapseFn).find((key) =>
      result.bucketCollapseFn[key].includes(result.buckets.customBuckets[metrics[0].columnId])
    );
    return {
      indexPatternId,
      layerId,
      columns: [...metrics, ...buckets].map(excludeMetaFromColumn),
      columnOrder: [],
      seriesId: s.data.id,
      collapseFn,
      isReferenceLineLayer: false,
    };
  });

  if (vis.params.thresholdLine.show) {
    layers.push({
      indexPatternId,
      layerId: uuid(),
      columns: [createStaticValueColumn(vis.params.thresholdLine.value || 0)],
      columnOrder: [],
      isReferenceLineLayer: true,
      collapseFn: undefined,
      seriesId: '',
    });
  }

  return {
    type: 'lnsXY',
    layers: layers.map(({ seriesId, collapseFn, isReferenceLineLayer, ...rest }) => rest),
    configuration: getConfiguration(layers, visibleSeries, vis),
    indexPatternIds: [indexPatternId],
  };
};
