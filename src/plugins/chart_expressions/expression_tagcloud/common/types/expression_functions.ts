/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { PaletteOutput } from '../../../../charts/common';
import {
  Datatable,
  ExpressionFunctionDefinition,
  ExpressionValueRender,
} from '../../../../expressions';
import { ExpressionValueVisDimension } from '../../../../visualizations/common';
import { EXPRESSION_NAME } from '../constants';

interface TagCloudCommonParams {
  scale: 'linear' | 'log' | 'square root';
  orientation: 'single' | 'right angled' | 'multiple';
  minFontSize: number;
  maxFontSize: number;
  showLabel: boolean;
  ariaLabel?: string;
}

export interface TagCloudVisConfig extends TagCloudCommonParams {
  metric: ExpressionValueVisDimension;
  bucket?: ExpressionValueVisDimension;
}

export interface TagCloudRendererParams extends TagCloudCommonParams {
  palette: PaletteOutput;
  metric: ExpressionValueVisDimension;
  bucket?: ExpressionValueVisDimension;
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
