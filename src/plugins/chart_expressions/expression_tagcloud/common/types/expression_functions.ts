/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { $Values } from '@kbn/utility-types';
import type { PaletteOutput } from '@kbn/coloring';
import {
  Datatable,
  ExpressionFunctionDefinition,
  ExpressionValueRender,
} from '@kbn/expressions-plugin';
import { ExpressionValueVisDimension } from '@kbn/visualizations-plugin/common';
import { EXPRESSION_NAME, ScaleOptions, Orientation } from '../constants';

interface TagCloudCommonParams {
  scale: $Values<typeof ScaleOptions>;
  orientation: $Values<typeof Orientation>;
  minFontSize: number;
  maxFontSize: number;
  showLabel: boolean;
  ariaLabel?: string;
}

export interface TagCloudVisConfig extends TagCloudCommonParams {
  metric: ExpressionValueVisDimension | string;
  bucket?: ExpressionValueVisDimension | string;
}

export interface TagCloudRendererParams extends TagCloudCommonParams {
  palette: PaletteOutput;
  metric: ExpressionValueVisDimension | string;
  bucket?: ExpressionValueVisDimension | string;
}

export interface TagcloudRendererConfig {
  visType: typeof EXPRESSION_NAME;
  visData: Datatable;
  visParams: TagCloudRendererParams;
  syncColors: boolean;
}

interface Arguments extends TagCloudVisConfig {
  palette: PaletteOutput;
}

export type ExpressionTagcloudFunction = () => ExpressionFunctionDefinition<
  'tagcloud',
  Datatable,
  Arguments,
  ExpressionValueRender<TagcloudRendererConfig>
>;
