/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ColorSchemaParams, Labels, Style } from '@kbn/charts-plugin/public';
import { RangeValues } from '@kbn/vis-default-editor-plugin/public';
import { gaugeVisType } from '@kbn/vis-type-gauge-plugin/public';
import { VisTypeDefinition } from '@kbn/visualizations-plugin/public';

import { Alignment, GaugeType } from './types';
import { toExpressionAst } from './to_ast';

export interface Gauge extends ColorSchemaParams {
  backStyle: 'Full';
  gaugeStyle: 'Full';
  orientation: 'vertical';
  type: 'meter';
  alignment: Alignment;
  colorsRange: RangeValues[];
  extendRange: boolean;
  gaugeType: GaugeType;
  labels: Labels;
  percentageMode: boolean;
  percentageFormatPattern?: string;
  outline?: boolean;
  scale: {
    show: boolean;
    labels: false;
    color: 'rgba(105,112,125,0.2)';
  };
  style: Style;
}

export interface GaugeVisParams {
  type: 'gauge';
  addTooltip: boolean;
  addLegend: boolean;
  isDisplayWarning: boolean;
  gauge: Gauge;
}

export const gaugeVisTypeDefinition = {
  ...gaugeVisType({}),
  toExpressionAst,
} as VisTypeDefinition<GaugeVisParams>;
