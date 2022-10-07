/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { AggBasedColumn, Column, ColumnWithMeta } from '@kbn/visualizations-plugin/common';
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

export interface Layer {
  indexPatternId: string;
  layerId: string;
  columns: Column[];
  columnOrder: never[];
  seriesId: string;
  isReferenceLineLayer: boolean;
  collapseFn?: string;
}

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
    (param) => param.show && visSchemas.metric.some((m) => m.aggId?.split('.')[0] === param.data.id)
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

  const layers = visibleSeries.reduce<Layer[]>((accLayers, s) => {
    const layerId = uuid();
    const metrics = result.columns.filter((c) => c.meta.aggId.split('.')[0] === s.data.id);
    const buckets = result.columns.reduce<AggBasedColumn[]>((acc, c) => {
      if (c.isBucketed) {
        let bucketColumn = c;
        // should change column id because each layer should includes its own columns (not use one column id for all layers)
        if (accLayers.some((value) => value.columns.some((col) => col.columnId === c.columnId))) {
          bucketColumn = { ...c, columnId: uuid() };
        }
        if (c.isSplit) {
          // as each sibling pipeline agg can have different custom bucket we should get correct one for layer
          if (
            Object.keys(result.buckets.customBuckets).some((key) =>
              result.buckets.customBuckets[key].includes(c.columnId)
            )
          ) {
            if (result.buckets.customBuckets[metrics[0].columnId] === c.columnId) {
              acc.push(bucketColumn);
            }
            return acc;
          }
        }

        acc.push(bucketColumn);
      }

      return acc;
    }, []);
    const collapseFn = Object.keys(result.bucketCollapseFn).find((key) =>
      result.bucketCollapseFn[key].includes(result.buckets.customBuckets[metrics[0].columnId])
    );
    accLayers.push({
      indexPatternId,
      layerId,
      columns: [...metrics, ...buckets].map(excludeMetaFromColumn),
      columnOrder: [],
      seriesId: s.data.id,
      collapseFn,
      isReferenceLineLayer: false,
    });
    return accLayers;
  }, []);

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
