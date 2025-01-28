/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PaletteOutput } from '@kbn/coloring';
import {
  Datatable,
  DefaultInspectorAdapters,
  ExecutionContext,
  ExpressionFunctionDefinition,
  ExpressionValueRender,
  Style,
} from '@kbn/expressions-plugin/common';
import { ExpressionValueVisDimension } from '@kbn/visualizations-plugin/common';
import { ColorMode, CustomPaletteState } from '@kbn/charts-plugin/common';
import { VisParams, visType, LabelPositionType, MetricAlignment } from './expression_renderers';
import { EXPRESSION_METRIC_NAME } from '../constants';

export interface MetricArguments {
  autoScaleMetricAlignment?: MetricAlignment;
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
  canNavigateToLens: boolean;
}

export type MetricVisExpressionFunctionDefinition = ExpressionFunctionDefinition<
  typeof EXPRESSION_METRIC_NAME,
  MetricInput,
  MetricArguments,
  ExpressionValueRender<MetricVisRenderConfig>,
  ExecutionContext<DefaultInspectorAdapters>
>;
