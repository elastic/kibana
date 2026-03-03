/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ExpressionValueVisDimension } from '@kbn/chart-expressions-common';
import { getColumnByAccessor, validateAccessor } from '@kbn/chart-expressions-common';
import type { Datatable } from '@kbn/expressions-plugin/common';
import type { ExtendedDataLayerArgs, ExtendedDataLayerFn, XScaleType } from '../types';
import { EXTENDED_DATA_LAYER, LayerTypes, XScaleTypes } from '../constants';
import { getAccessors, normalizeTable, getShowLines } from '../helpers';
import {
  validateLinesVisibilityForChartType,
  validateLineWidthForChartType,
  validateMarkSizeForChartType,
  validatePointsRadiusForChartType,
  validateShowPointsForChartType,
} from './validate';

/**
 * Reconciles xScaleType and isHistogram with the actual Datatable column metadata.
 * This ensures that date columns are always rendered with a time scale and histogram
 * behavior (enabling brush/zoom), even when the pre-computed values from the expression
 * builder are stale (e.g. after restoring a saved ES|QL visualization that lost column
 * type info).
 */
function resolveXAxisMeta(
  args: Pick<ExtendedDataLayerArgs, 'xScaleType' | 'isHistogram'>,
  xAccessor: string | ExpressionValueVisDimension | undefined,
  columns: Datatable['columns']
): Pick<ExtendedDataLayerArgs, 'xScaleType' | 'isHistogram'> {
  if (!xAccessor) {
    return args;
  }
  const column = getColumnByAccessor(xAccessor, columns);
  if (!column) {
    return args;
  }

  let { xScaleType, isHistogram } = args;

  if (column.meta?.type === 'date') {
    xScaleType = XScaleTypes.TIME as XScaleType;
    isHistogram = true;
  }

  return { xScaleType, isHistogram };
}

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
  const { xScaleType, isHistogram } = resolveXAxisMeta(args, accessors.xAccessor, table.columns);

  return {
    type: EXTENDED_DATA_LAYER,
    ...args,
    xScaleType,
    isHistogram,
    layerType: LayerTypes.DATA,
    ...accessors,
    table: normalizedTable,
    showLines,
  };
};
