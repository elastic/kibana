/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { RangeValues } from '@kbn/vis-default-editor-plugin/public';
import { getHeatmapVisType } from '@kbn/vis-type-heatmap-plugin/public';
import { ColorSchemaParams } from '@kbn/charts-plugin/public';
import { ValueAxis } from '@kbn/vis-type-xy-plugin/public';
import { TimeMarker } from './vislib/visualizations/time_marker';
import { CommonVislibParams } from './types';

export interface HeatmapVisParams extends CommonVislibParams, ColorSchemaParams {
  type: 'heatmap';
  addLegend: boolean;
  enableHover: boolean;
  colorsNumber: number | '';
  colorsRange: RangeValues[];
  valueAxes: ValueAxis[];
  setColorRange: boolean;
  percentageMode: boolean;
  percentageFormatPattern?: string;
  times: TimeMarker[];
}

export async function getLegacyHeatmapVisType() {
  const { toExpressionAst } = await import('./to_ast');
  return {
    ...(await getHeatmapVisType()),
    toExpressionAst,
  };
}
