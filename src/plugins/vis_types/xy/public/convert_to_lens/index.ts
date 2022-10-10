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
import uuid from 'uuid/v4';
import { getDataViewsStart } from '../services';
import { getSeriesParams } from '../utils/get_series_params';
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

  const visSchemas = getVisSchemas(vis, {
    timefilter,
    timeRange: timefilter.getAbsoluteTime(),
  });

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

  const [{ getColumnsFromVis, createStaticValueColumn }, { getConfiguration }] = await Promise.all([
    convertToLensModule,
    import('./configurations'),
  ]);
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
    visibleSeries.map((s) => ({ metrics: [s.data.id] }))
  );

  if (dataLayers === null) {
    return null;
  }

  // doesn't support sibling pipeline aggs and split series together
  if (
    visSchemas.group?.length &&
    dataLayers.some((l) => Object.keys(l.buckets.customBuckets).length)
  ) {
    return null;
  }

  // doesn't support several metrics with terms split series which uses one of the metrics as order agg
  if (
    visSchemas.metric.length > 1 &&
    dataLayers.some((l) =>
      l.columns.some(
        (c) => c.isSplit && 'orderBy' in c.params && c.params.orderBy.type === 'column'
      )
    )
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

  const layers = dataLayers.reduce<Layer[]>((accLayers, l) => {
    const layerId = uuid();
    const series = visibleSeries.find((s) =>
      l.columns.some((c) => c.meta.aggId.split('.')[0] === s.data.id)
    );
    const collapseFn = Object.keys(l.bucketCollapseFn).find((key) =>
      l.bucketCollapseFn[key].includes(l.buckets.customBuckets[l.metrics[0]])
    );
    accLayers.push({
      indexPatternId,
      layerId,
      columns: l.columns.map(excludeMetaFromColumn),
      columnOrder: [],
      seriesId: series?.data.id!,
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
