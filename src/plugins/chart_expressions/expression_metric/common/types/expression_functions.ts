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
  ExpressionValueRender,
  Style,
} from '../../../../expressions';
import { ExpressionValueVisDimension } from '../../../../visualizations/common';
import { ColorMode, CustomPaletteState, PaletteOutput } from '../../../../charts/common';
import { VisParams, visType, LabelPositionType } from './expression_renderers';
import { EXPRESSION_METRIC_NAME } from '../constants';

export interface MetricArguments {
  percentageMode: boolean;
  colorMode: ColorMode;
  showLabels: boolean;
  palette?: PaletteOutput<CustomPaletteState>;
  font: Style;
  labelFont: Style;
  labelPosition: LabelPositionType;
  metric: Array<ExpressionValueVisDimension | string>;
  bucket?: ExpressionValueVisDimension | string;
  colorFullBackground: boolean;
  autoScale?: boolean;
}

export type MetricInput = Datatable;

export interface MetricVisRenderConfig {
  visType: typeof visType;
  visData: Datatable;
  visConfig: Pick<VisParams, 'metric' | 'dimensions'>;
}

export type MetricVisExpressionFunctionDefinition = ExpressionFunctionDefinition<
  typeof EXPRESSION_METRIC_NAME,
  MetricInput,
  MetricArguments,
  ExpressionValueRender<MetricVisRenderConfig>
>;
