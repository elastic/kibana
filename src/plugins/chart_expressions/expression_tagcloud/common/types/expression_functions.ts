/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { $Values } from '@kbn/utility-types';
import type { PaletteOutput } from '@kbn/coloring';
import {
  Datatable,
  ExpressionFunctionDefinition,
  ExpressionValueRender,
} from '@kbn/expressions-plugin/common';
import { ExpressionValueVisDimension } from '@kbn/visualizations-plugin/common';
import type { AllowedSettingsOverrides, AllowedChartOverrides } from '@kbn/charts-plugin/common';
import { EXPRESSION_NAME, ScaleOptions, Orientation } from '../constants';

interface TagCloudCommonParams {
  scale?: $Values<typeof ScaleOptions>;
  orientation: $Values<typeof Orientation>;
  minFontSize: number;
  maxFontSize: number;
  showLabel: boolean;
  ariaLabel?: string;
  metric: ExpressionValueVisDimension | string;
  bucket?: ExpressionValueVisDimension | string;
  palette: PaletteOutput;
  colorMapping?: string; // JSON stringified object of the color mapping
}

export interface TagCloudVisConfig extends TagCloudCommonParams {
  isPreview?: boolean;
}

export interface TagCloudRendererParams extends TagCloudCommonParams {
  isPreview: boolean;
}

export interface TagcloudRendererConfig {
  visType: typeof EXPRESSION_NAME;
  visData: Datatable;
  visParams: TagCloudRendererParams;
  syncColors: boolean;
  overrides?: AllowedSettingsOverrides & AllowedChartOverrides;
}

export type ExpressionTagcloudFunctionDefinition = ExpressionFunctionDefinition<
  typeof EXPRESSION_NAME,
  Datatable,
  TagCloudVisConfig,
  ExpressionValueRender<TagcloudRendererConfig>
>;

export type ExpressionTagcloudFunction = () => ExpressionTagcloudFunctionDefinition;
