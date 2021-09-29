/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  Datatable,
  ExpressionFunctionDefinition,
  Range,
  ExpressionValueRender,
  Style,
} from '../../../../expressions';
import { ExpressionValueVisDimension } from '../../../../visualizations/common';
import { ColorSchemas, ColorMode } from '../../../../charts/common';
import { VisParams, visType } from './expression_renderers';
import { EXPRESSION_METRIC_NAME } from '../constants';

export interface Arguments {
  percentageMode: boolean;
  colorSchema: ColorSchemas;
  colorMode: ColorMode;
  useRanges: boolean;
  invertColors: boolean;
  showLabels: boolean;
  bgFill: string;
  subText: string;
  colorRange: Range[];
  font: Style;
  metric: ExpressionValueVisDimension[];
  bucket: ExpressionValueVisDimension;
}

export type Input = Datatable;

export interface MetricVisRenderConfig {
  visType: typeof visType;
  visData: Input;
  visConfig: Pick<VisParams, 'metric' | 'dimensions'>;
}

export type MetricVisExpressionFunctionDefinition = ExpressionFunctionDefinition<
  typeof EXPRESSION_METRIC_NAME,
  Input,
  Arguments,
  ExpressionValueRender<MetricVisRenderConfig>
>;
