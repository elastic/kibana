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
  SerializedFieldFormat,
} from '../../../../expressions';
import { ExpressionValueVisDimension } from '../../../../visualizations/common';
import { EXPRESSION_NAME } from '../constants';

interface Dimension {
  accessor: number;
  format: {
    id?: string;
    params?: SerializedFieldFormat<object>;
  };
}

interface TagCloudCommonParams {
  scale: 'linear' | 'log' | 'square root';
  orientation: 'single' | 'right angled' | 'multiple';
  minFontSize: number;
  maxFontSize: number;
  showLabel: boolean;
}

export interface TagCloudVisConfig extends TagCloudCommonParams {
  metric: ExpressionValueVisDimension;
  bucket?: ExpressionValueVisDimension;
}

export interface TagCloudVisParams extends TagCloudCommonParams {
  palette: PaletteOutput;
  metric: Dimension;
  bucket?: Dimension;
}

export interface TagcloudRendererConfig {
  visType: typeof EXPRESSION_NAME;
  visData: Datatable;
  visParams: TagCloudVisParams;
  syncColors: boolean;
}

interface Arguments extends TagCloudVisConfig {
  palette: string;
}

export type ExpressionTagcloudFunction = () => ExpressionFunctionDefinition<
  'tagcloud',
  Datatable,
  Arguments,
  ExpressionValueRender<TagcloudRendererConfig>
>;
