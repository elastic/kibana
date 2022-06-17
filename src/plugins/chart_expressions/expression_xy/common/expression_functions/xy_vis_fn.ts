/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  Dimension,
  prepareLogTable,
  validateAccessor,
} from '@kbn/visualizations-plugin/common/utils';
import type { Datatable } from '@kbn/expressions-plugin/common';
import { ExpressionValueVisDimension } from '@kbn/visualizations-plugin/common/expression_functions';
import { LayerTypes, XY_VIS_RENDERER, DATA_LAYER, REFERENCE_LINE } from '../constants';
import { appendLayerIds, getAccessors, getShowLines, normalizeTable } from '../helpers';
import { DataLayerConfigResult, XYLayerConfig, XyVisFn, XYArgs } from '../types';
import { getLayerDimensions } from '../utils';
import {
  hasAreaLayer,
  hasBarLayer,
  hasHistogramBarLayer,
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
} from './validate';

const createDataLayer = (args: XYArgs, table: Datatable): DataLayerConfigResult => {
  const accessors = getAccessors<string | ExpressionValueVisDimension, XYArgs>(args, table);
  const normalizedTable = normalizeTable(table, accessors.xAccessor);
  return {
    type: DATA_LAYER,
    seriesType: args.seriesType,
    hide: args.hide,
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
    ...accessors,
  };
};

export const xyVisFn: XyVisFn['fn'] = async (data, args, handlers) => {
  validateAccessor(args.splitRowAccessor, data.columns);
  validateAccessor(args.splitColumnAccessor, data.columns);

  const {
    referenceLines = [],
    annotationLayers = [],
    // data_layer args
    seriesType,
    accessors,
    xAccessor,
    hide,
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
    ...appendLayerIds(annotationLayers, 'annotationLayers'),
  ];

  if (handlers.inspectorAdapters.tables) {
    handlers.inspectorAdapters.tables.reset();
    handlers.inspectorAdapters.tables.allowCsvExport = true;

    const layerDimensions = layers.reduce<Dimension[]>((dimensions, layer) => {
      if (layer.layerType === LayerTypes.ANNOTATIONS || layer.type === REFERENCE_LINE) {
        return dimensions;
      }

      return [...dimensions, ...getLayerDimensions(layer)];
    }, []);

    const logTable = prepareLogTable(data, layerDimensions, true);
    handlers.inspectorAdapters.tables.logDatatable('default', logTable);
  }

  const hasBar = hasBarLayer(dataLayers);
  const hasArea = hasAreaLayer(dataLayers);

  validateExtents(dataLayers, hasBar || hasArea, args.yAxisConfigs, args.xAxisConfig);
  validateFillOpacity(args.fillOpacity, hasArea);
  validateAddTimeMarker(dataLayers, args.addTimeMarker);
  validateMinTimeBarInterval(dataLayers, hasBar, args.minTimeBarInterval);

  const hasNotHistogramBars = !hasHistogramBarLayer(dataLayers);

  validateValueLabels(args.valueLabels, hasBar, hasNotHistogramBars);
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
        markSizeRatio:
          dataLayers[0].markSizeAccessor && !args.markSizeRatio ? 10 : args.markSizeRatio,
        ariaLabel:
          args.ariaLabel ??
          (handlers.variables?.embeddableTitle as string) ??
          handlers.getExecutionContext?.()?.description,
      },
    },
  };
};
