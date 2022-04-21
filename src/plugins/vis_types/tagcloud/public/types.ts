/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { PaletteOutput } from '@kbn/coloring';
import type { ChartsPluginSetup } from '../../../charts/public';
import { ExpressionValueVisDimension } from '../../../visualizations/public';

interface TagCloudCommonParams {
  scale: 'linear' | 'log' | 'square root';
  orientation: 'single' | 'right angled' | 'multiple';
  minFontSize: number;
  maxFontSize: number;
  showLabel: boolean;
}

export interface TagCloudVisParams extends TagCloudCommonParams {
  palette: PaletteOutput;
  metric: ExpressionValueVisDimension;
  bucket?: ExpressionValueVisDimension;
}

export interface TagCloudTypeProps {
  palettes: ChartsPluginSetup['palettes'];
}
