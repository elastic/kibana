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

/** Options for the AI button gradient hooks. */
export interface AiButtonGradientOptions {
  readonly variant?: AiButtonVariant;
  readonly iconOnly?: boolean;
}

/** Computed gradient styles for an AI button. */
export interface AiButtonGradientStyles {
  readonly buttonCss: SerializedStyles;
  readonly labelCss: SerializedStyles;
}

/** Start and end colors for a linear gradient. */
export interface AiGradientColors {
  readonly startColor: string;
  readonly endColor: string;
}

/** Resolved per-variant button styles. */
export interface ResolvedVariantStyles {
  readonly buttonBackground: string;
  readonly hoverBackground: string;
  readonly borderGradient?: string;
  readonly labelColor: string;
  readonly labelCss: SerializedStyles;
}

/** SVG gradient for the AI button icon. */
export interface SvgAiGradient {
  readonly iconGradientCss?: SerializedStyles;
  readonly gradientId: string;
  readonly colors: AiGradientColors;
}
