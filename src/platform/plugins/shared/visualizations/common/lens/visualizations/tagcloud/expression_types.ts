/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { $Values } from '@kbn/utility-types';
import { PaletteOutput } from '@kbn/coloring';
import { ExpressionValueVisDimension } from '../../..';
import { TAGCLOUD_ORIENTATION, TAGCLOUD_SCALE_OPTIONS } from './constants';

export interface ExpressionTagCloudCommonParams {
  scale?: $Values<typeof TAGCLOUD_SCALE_OPTIONS>;
  orientation: $Values<typeof TAGCLOUD_ORIENTATION>;
  minFontSize: number;
  maxFontSize: number;
  showLabel: boolean;
  ariaLabel?: string;
  metric: ExpressionValueVisDimension | string;
  bucket?: ExpressionValueVisDimension | string;
  palette: PaletteOutput;
  colorMapping?: string; // JSON stringified object of the color mapping
}
