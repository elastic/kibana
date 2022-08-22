/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  FillTypes,
  XYLayerConfig,
  YAxisMode,
} from '@kbn/visualizations-plugin/common/convert_to_lens';
import { PaletteOutput } from '@kbn/coloring';
import { SUPPORTED_METRICS } from '../../metrics';
import type { Metric, Panel } from '../../../../../common/types';
import { getSeriesAgg } from '../../series';
import {
  isPercentileRanksColumnWithMeta,
  isPercentileColumnWithMeta,
  Column,
  Layer,
  AnyColumnWithReferences,
} from '../../convert';
import { getChartType } from './chart_type';

export const isColumnWithReference = (column: Column): column is AnyColumnWithReferences =>
  Boolean((column as AnyColumnWithReferences).references);

function getPalette(palette: PaletteOutput): PaletteOutput {
  return !palette || palette.name === 'gradient' || palette.name === 'rainbow'
    ? { name: 'default', type: 'palette' }
    : palette;
}

function getColor(
  metricColumn: Column,
  metric: Metric,
  seriesColor: string,
  splitAccessor?: string
) {
  if (isPercentileColumnWithMeta(metricColumn) && !splitAccessor) {
    const [_, percentileIndex] = metricColumn.meta.reference.split('.');
    return metric.percentiles?.[parseInt(percentileIndex, 10)]?.color;
  }
  if (isPercentileRanksColumnWithMeta(metricColumn) && !splitAccessor) {
    const [_, percentileRankIndex] = metricColumn.meta.reference.split('.');
    return metric.colors?.[parseInt(percentileRankIndex, 10)];
  }

  return seriesColor;
}

export const getLayers = (
  dataSourceLayers: Record<number, Layer>,
  model: Panel
): XYLayerConfig[] => {
  return Object.keys(dataSourceLayers).map((key) => {
    const series = model.series[parseInt(key, 10)];
    const { metrics, seriesAgg } = getSeriesAgg(series.metrics);
    const dataSourceLayer = dataSourceLayers[parseInt(key, 10)];
    const referenceColumn = dataSourceLayer.columns.find(
      (column): column is AnyColumnWithReferences => isColumnWithReference(column)
    );
    // as pipiline aggregation has only one reference id
    const referenceColumnId = referenceColumn?.references[0];
    // we should not include columns which using as reference for pipeline aggs
    const metricColumns = dataSourceLayer.columns.filter(
      (l) => !l.isBucketed && l.columnId !== referenceColumnId
    );
    const isReferenceLine = metrics.length === 1 && metrics[0].type === 'static';
    const splitAccessor = dataSourceLayer.columns.find(
      (column) => column.isBucketed && column.isSplit
    )?.columnId;
    const chartType = getChartType(series, model.type);
    const commonProps = {
      seriesType: chartType,
      layerId: dataSourceLayer.layerId,
      accessors: metricColumns.map((metricColumn) => {
        return metricColumn.columnId;
      }),
      yConfig: metricColumns.map((metricColumn) => {
        const metric = metrics.find(
          (m) => SUPPORTED_METRICS[m.type]?.name === metricColumn.operationType
        );
        return {
          forAccessor: metricColumn.columnId,
          color: getColor(metricColumn, metric!, series.color, splitAccessor),
          axisMode: (series.separate_axis
            ? series.axis_position
            : model.axis_position) as YAxisMode,
          ...(isReferenceLine && {
            fill: chartType === 'area' ? FillTypes.BELOW : FillTypes.NONE,
          }),
        };
      }),
      xAccessor: dataSourceLayer.columns.find((column) => column.isBucketed && !column.isSplit)
        ?.columnId,
      splitAccessor,
      collapseFn: seriesAgg,
      palette: getPalette(series.palette as PaletteOutput),
    };
    if (isReferenceLine) {
      return {
        layerType: 'referenceLine',
        ...commonProps,
      };
    } else {
      return {
        layerType: 'data',
        ...commonProps,
      };
    }
  });
};
