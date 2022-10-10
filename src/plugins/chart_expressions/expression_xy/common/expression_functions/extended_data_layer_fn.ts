/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ExpressionValueVisDimension } from '@kbn/visualizations-plugin/common';
import { validateAccessor } from '@kbn/visualizations-plugin/common/utils';
import { ExtendedDataLayerArgs, ExtendedDataLayerFn } from '../types';
import { EXTENDED_DATA_LAYER, LayerTypes } from '../constants';
import { getAccessors, normalizeTable, getShowLines } from '../helpers';
import {
  validateLinesVisibilityForChartType,
  validateLineWidthForChartType,
  validateMarkSizeForChartType,
  validatePointsRadiusForChartType,
  validateShowPointsForChartType,
} from './validate';

export const extendedDataLayerFn: ExtendedDataLayerFn['fn'] = async (data, args, context) => {
  const table = data;
  const accessors = getAccessors<string | ExpressionValueVisDimension, ExtendedDataLayerArgs>(
    args,
    table
  );

  validateAccessor(accessors.xAccessor, table.columns);
  accessors.splitAccessors?.forEach((accessor) => validateAccessor(accessor, table.columns));
  accessors.accessors.forEach((accessor) => validateAccessor(accessor, table.columns));
  validateMarkSizeForChartType(args.markSizeAccessor, args.seriesType);
  validateAccessor(args.markSizeAccessor, table.columns);
  validateLineWidthForChartType(args.lineWidth, args.seriesType);
  validateShowPointsForChartType(args.showPoints, args.seriesType);
  validatePointsRadiusForChartType(args.pointsRadius, args.seriesType);
  validateLinesVisibilityForChartType(args.showLines, args.seriesType);

  const normalizedTable = normalizeTable(table, accessors.xAccessor);

  const showLines = getShowLines(args);

  return {
    type: EXTENDED_DATA_LAYER,
    ...args,
    layerType: LayerTypes.DATA,
    ...accessors,
    table: normalizedTable,
    showLines,
  };
};
