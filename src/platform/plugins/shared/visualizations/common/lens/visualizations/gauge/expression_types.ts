/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { $Values } from '@kbn/utility-types';
import { CustomPaletteParams, PaletteOutput } from '@kbn/coloring';
import { ExpressionValueVisDimension } from '@kbn/visualizations-plugin/common';
import {
  GAUGE_CENTRAL_MAJOR_MODES,
  GAUGE_COLOR_MODES,
  GAUGE_LABEL_MAJOR_MODES,
  GAUGE_SHAPES,
  GAUGE_TICKS_POSITIONS,
} from './constants';

export type GaugeColorMode = $Values<typeof GAUGE_COLOR_MODES>;
export type GaugeShape = $Values<typeof GAUGE_SHAPES>;
export type GaugeLabelMajorMode = $Values<typeof GAUGE_LABEL_MAJOR_MODES>;
export type GaugeCentralMajorMode = $Values<typeof GAUGE_CENTRAL_MAJOR_MODES>;
export type GaugeTicksPosition = $Values<typeof GAUGE_TICKS_POSITIONS>;

export interface GaugeExpressionArgs {
  metric?: string | ExpressionValueVisDimension;
  min?: string | ExpressionValueVisDimension;
  max?: string | ExpressionValueVisDimension;
  goal?: string | ExpressionValueVisDimension;
  ticksPosition: GaugeTicksPosition;
  labelMajorMode: GaugeLabelMajorMode;
  labelMajor?: string;
  labelMinor?: string;
  colorMode?: GaugeColorMode;
  palette?: PaletteOutput<CustomPaletteParams>;
  shape: GaugeShape;
  respectRanges?: boolean;
  commonLabel?: string;
  /**
   * @deprecated Use `labelMajorMode` instead
   */
  centralMajorMode?: GaugeCentralMajorMode;
  /**
   * @deprecated Use `labelMajor` instead
   */
  centralMajor?: string;
  /**
   * This field is deprecated and will be removed in a future release
   * @deprecated
   */
  percentageMode?: boolean;
}
