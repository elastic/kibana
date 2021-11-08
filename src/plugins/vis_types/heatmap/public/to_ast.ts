/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import moment from 'moment';

import { VisToExpressionAst, getVisSchemas } from '../../../visualizations/public';
import { buildExpression, buildExpressionFunction } from '../../../expressions/public';
import type { DateHistogramParams, HistogramParams } from '../../../visualizations/public';
import { getStopsWithColorsFromRanges, getStopsWithColorsFromColorsNumber } from './utils/palette';

import { BUCKET_TYPES } from '../../../data/public';

import { vislibHeatmapName, ExpressionHeatmapFunction } from './heatmap_fn';
import type { Dimensions, Dimension, HeatmapVisParams } from './types';
import { getEsaggsFn } from './to_ast_esaggs';

const prepareVisDimension = (data: Dimension) => {
  const visDimension = buildExpressionFunction('visdimension', { accessor: data.accessor });

  if (data.format) {
    visDimension.addArgument('format', data.format.id);
    visDimension.addArgument('formatParams', JSON.stringify(data.format.params));
  }

  return buildExpression([visDimension]);
};

export const toExpressionAst: VisToExpressionAst<HeatmapVisParams> = async (vis, params) => {
  const schemas = getVisSchemas(vis, params);
  const dimensions: Dimensions = {
    x: schemas.segment ? schemas.segment[0] : null,
    y: schemas.metric,
    z: schemas.radius,
    series: schemas.group,
    splitRow: schemas.split_row,
    splitColumn: schemas.split_column,
  };

  const responseAggs = vis.data.aggs?.getResponseAggs() ?? [];

  if (dimensions.x) {
    const xAgg = responseAggs[dimensions.x.accessor] as any;
    if (xAgg.type.name === BUCKET_TYPES.DATE_HISTOGRAM) {
      (dimensions.x.params as DateHistogramParams).date = true;
      const { esUnit, esValue } = xAgg.buckets.getInterval();
      (dimensions.x.params as DateHistogramParams).intervalESUnit = esUnit;
      (dimensions.x.params as DateHistogramParams).intervalESValue = esValue;
      (dimensions.x.params as DateHistogramParams).interval = moment
        .duration(esValue, esUnit)
        .asMilliseconds();
      (dimensions.x.params as DateHistogramParams).format = xAgg.buckets.getScaledDateFormat();
      (dimensions.x.params as DateHistogramParams).bounds = xAgg.buckets.getBounds();
    } else if (xAgg.type.name === BUCKET_TYPES.HISTOGRAM) {
      const intervalParam = xAgg.type.paramByName('interval');
      const output = { params: {} as any };
      await intervalParam.modifyAggConfigOnSearchRequestStart(xAgg, vis.data.searchSource, {
        abortSignal: params.abortSignal,
      });
      intervalParam.write(xAgg, output);
      (dimensions.x.params as HistogramParams).interval = output.params.interval;
    }
  }

  const args = {
    // explicitly pass each param to prevent extra values trapping
    addTooltip: vis.params.addTooltip,
    enableHover: vis.params.enableHover,
    addLegend: vis.params.addLegend,
    legendPosition: vis.params.legendPosition,
    useDistinctBands: vis.params.useDistinctBands,
    percentageMode: vis.params.percentageMode,
    percentageFormatPattern: vis.params.percentageFormatPattern,
    isCellLabelVisible: vis.params.isCellLabelVisible,
    // maxLegendLines: vis.params.maxLegendLines,
    palette: vis.params?.palette,
    xDimension: dimensions.x ? prepareVisDimension(dimensions.x) : null,
    yDimension: dimensions.y.map(prepareVisDimension),
    zDimension: dimensions.z?.map(prepareVisDimension),
    seriesDimension: dimensions.series?.map(prepareVisDimension),
    splitRowDimension: dimensions.splitRow?.map(prepareVisDimension),
    splitColumnDimension: dimensions.splitColumn?.map(prepareVisDimension),
  };

  const visTypeHeatmap = buildExpressionFunction<ExpressionHeatmapFunction>(
    vislibHeatmapName,
    args
  );
  let palette;
  if (vis.params.setColorRange && vis.params.colorsRange && vis.params.colorsRange.length) {
    const stopsWithColors = getStopsWithColorsFromRanges(
      vis.params.colorsRange,
      vis.params.colorSchema,
      vis.params.invertColors
    );
    palette = buildExpressionFunction('palette', {
      ...stopsWithColors,
      range: 'number',
      continuity: 'none',
      rangeMax:
        vis.params.setColorRange && vis.params.colorsRange && vis.params.colorsRange.length
          ? vis.params.colorsRange[vis.params?.colorsRange.length - 1].to
          : undefined,
    });
  } else {
    const stopsWithColors = getStopsWithColorsFromColorsNumber(
      vis.params.colorsNumber,
      vis.params.colorSchema,
      vis.params.invertColors
    );
    palette = buildExpressionFunction('palette', {
      ...stopsWithColors,
      range: 'percent',
      continuity: 'none',
      rangeMin: 0,
      rangeMax: 100,
    });
  }
  visTypeHeatmap.addArgument('palette', buildExpression([palette]));

  const ast = buildExpression([getEsaggsFn(vis), visTypeHeatmap]);

  return ast.toAst();
};
