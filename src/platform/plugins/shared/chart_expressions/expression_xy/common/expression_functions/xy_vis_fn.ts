/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { validateAccessor } from '@kbn/visualizations-plugin/common/utils';
import type { Datatable } from '@kbn/expressions-plugin/common';
import { ExpressionValueVisDimension } from '@kbn/visualizations-plugin/common/expression_functions';
import { LayerTypes, XY_VIS_RENDERER, DATA_LAYER } from '../constants';
import { appendLayerIds, getAccessors, getShowLines, normalizeTable } from '../helpers';
import type { DataLayerConfigResult, XYLayerConfig, XyVisFn, XYArgs, XYRender } from '../types';
import {
  hasAreaLayer,
  hasBarLayer,
  validateExtents,
  validateFillOpacity,
  validateMarkSizeRatioLimits,
  validateValueLabels,
  validateAddTimeMarker,
  validateMinTimeBarInterval,
  validateMarkSizeForChartType,
  validateMarkSizeRatioWithAccessor,
  validateShowPointsForChartType,
  validateLineWidthForChartType,
  validatePointsRadiusForChartType,
  validateLinesVisibilityForChartType,
  validateAxes,
  validateMinBarHeight,
} from './validate';
import { logDatatable } from '../utils';

const createDataLayer = (args: XYArgs, table: Datatable): DataLayerConfigResult => {
  const accessors = getAccessors<string | ExpressionValueVisDimension, XYArgs>(args, table);
  const normalizedTable = normalizeTable(table, accessors.xAccessor);
  return {
    type: DATA_LAYER,
    seriesType: args.seriesType,
    simpleView: args.simpleView,
    columnToLabel: args.columnToLabel,
    xScaleType: args.xScaleType,
    isHistogram: args.isHistogram,
    isPercentage: args.isPercentage,
    isHorizontal: args.isHorizontal,
    isStacked: args.isStacked,
    palette: args.palette,
    decorations: args.decorations,
    showPoints: args.showPoints,
    pointsRadius: args.pointsRadius,
    lineWidth: args.lineWidth,
    layerType: LayerTypes.DATA,
    table: normalizedTable,
    showLines: args.showLines,
    colorMapping: args.colorMapping,
    ...accessors,
  };
};

export const xyVisFn: XyVisFn['fn'] = async (data, args, handlers) => {
  validateAccessor(args.splitRowAccessor, data.columns);
  validateAccessor(args.splitColumnAccessor, data.columns);

  const {
    referenceLines = [],
    // data_layer args
    seriesType,
    accessors,
    xAccessor,
    simpleView,
    splitAccessors,
    columnToLabel,
    xScaleType,
    isHistogram,
    isHorizontal,
    isPercentage,
    isStacked,
    decorations,
    palette,
    markSizeAccessor,
    showPoints,
    pointsRadius,
    lineWidth,
    showLines: realShowLines,
    ...restArgs
  } = args;

  validateLinesVisibilityForChartType(args.showLines, args.seriesType);
  const showLines = getShowLines(args);

  const dataLayers: DataLayerConfigResult[] = [createDataLayer({ ...args, showLines }, data)];

  validateAccessor(dataLayers[0].xAccessor, data.columns);
  dataLayers[0].splitAccessors?.forEach((accessor) => validateAccessor(accessor, data.columns));
  dataLayers[0].accessors.forEach((accessor) => validateAccessor(accessor, data.columns));

  validateMarkSizeForChartType(dataLayers[0].markSizeAccessor, args.seriesType);
  validateAccessor(dataLayers[0].markSizeAccessor, data.columns);

  const layers: XYLayerConfig[] = [
    ...appendLayerIds(dataLayers, 'dataLayers'),
    ...appendLayerIds(referenceLines, 'referenceLines'),
  ];

  logDatatable(data, layers, handlers, args.splitColumnAccessor, args.splitRowAccessor);

  const hasBar = hasBarLayer(dataLayers);
  const hasArea = hasAreaLayer(dataLayers);

  validateExtents(dataLayers, hasBar || hasArea, args.yAxisConfigs, args.xAxisConfig);
  validateFillOpacity(args.fillOpacity, hasArea);
  validateAddTimeMarker(dataLayers, args.addTimeMarker);
  validateMinTimeBarInterval(dataLayers, hasBar, args.minTimeBarInterval);
  validateMinBarHeight(args.minBarHeight);

  validateValueLabels(args.valueLabels, hasBar);
  validateMarkSizeRatioWithAccessor(args.markSizeRatio, dataLayers[0].markSizeAccessor);
  validateMarkSizeRatioLimits(args.markSizeRatio);
  validateLineWidthForChartType(lineWidth, args.seriesType);
  validateShowPointsForChartType(showPoints, args.seriesType);
  validatePointsRadiusForChartType(pointsRadius, args.seriesType);
  validateAxes(dataLayers, args.yAxisConfigs);

  return {
    type: 'render',
    as: XY_VIS_RENDERER,
    value: {
      args: {
        ...restArgs,
        layers,
        minBarHeight: args.minBarHeight ?? 1,
        markSizeRatio:
          dataLayers[0].markSizeAccessor && !args.markSizeRatio ? 10 : args.markSizeRatio,
        ariaLabel:
          args.ariaLabel ??
          (handlers.variables?.embeddableTitle as string) ??
          handlers.getExecutionContext?.()?.description,
      },
      canNavigateToLens: Boolean(handlers.variables.canNavigateToLens),
      syncColors: handlers?.isSyncColorsEnabled?.() ?? false,
      syncTooltips: handlers?.isSyncTooltipsEnabled?.() ?? false,
      syncCursor: handlers?.isSyncCursorEnabled?.() ?? true,
      overrides: handlers.variables?.overrides as XYRender['value']['overrides'],
    },
  };
};
