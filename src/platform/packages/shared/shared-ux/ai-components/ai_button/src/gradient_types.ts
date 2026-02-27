/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SerializedStyles } from '@emotion/react';
import type { AiButtonVariant } from './types';

/** Options for the gradient hooks (shared by button and SVG gradient). */
export interface AiButtonGradientOptions {
  readonly isFilled?: boolean;
  readonly variant?: AiButtonVariant;
  readonly iconOnly?: boolean;
}

/** Geometry for the SVG <linearGradient> defs element. */
export interface SvgLinearGradientGeometry {
  readonly gradientUnits: 'userSpaceOnUse';
  readonly x1: string;
  readonly y1: string;
  readonly x2: string;
  readonly y2: string;
}

/** Styles returned by `useAiButtonGradientStyles`. */
export interface AiButtonGradientStyles {
  readonly buttonCss: SerializedStyles;
  readonly labelCss: SerializedStyles;
}

/** Start/end colors for a gradient (used internally and in stops). */
export interface AiGradientColors {
  readonly startColor: string;
  readonly endColor: string;
}

/** Resolved styles per variant (internal to resolveVariantStyles). */
export interface ResolvedVariantStyles {
  readonly buttonBackground: string;
  readonly hoverBackground: string;
  readonly borderGradient?: string;
  readonly foregroundColor: string;
  readonly labelCss: SerializedStyles;
}

/** Return type of `useSvgAiGradient`. */
export interface SvgAiGradient {
  /**
   * Emotion CSS that applies the gradient to EUI icons (`.euiIcon`) via `fill/stroke`.
   */
  readonly iconGradientCss?: SerializedStyles;
  /**
   * The generated gradient id used by `SvgAiGradientDefs`.
   */
  readonly gradientId: string;
  /**
   * The gradient colors used by the SVG defs component.
   */
  readonly colors: AiGradientColors;
  /**
   * Optional geometry overrides for the rendered SVG <linearGradient>.
   */
  readonly defs?: SvgLinearGradientGeometry;
}
