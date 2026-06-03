/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { AiGradientColors } from './use_ai_gradient_styles';

/** Percentage offsets that inset the gradient stops to keep the color transition within the icon's visible area. */
const ICON_GRADIENT_START_OFFSET = 16;
const ICON_GRADIENT_END_OFFSET = 83;

export interface SvgAiGradientDefsProps {
  readonly gradientId: string;
  readonly colors: AiGradientColors;
}

/** EUI icons use viewBox="0 0 16 16" regardless of rendered CSS size; userSpaceOnUse coordinates target that viewBox. Gradient angle and bounds are per design spec. */
export const SvgAiGradientDefs = ({ gradientId, colors }: SvgAiGradientDefsProps): JSX.Element => {
  return (
    <svg width="0" height="0" aria-hidden="true" focusable="false" style={{ position: 'absolute' }}>
      <defs>
        <linearGradient
          id={gradientId}
          x1="-0.5"
          y1="-2.5"
          x2="15.5"
          y2="9.5"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset={`${ICON_GRADIENT_START_OFFSET}%`} stopColor={colors.startColor} />
          <stop offset={`${ICON_GRADIENT_END_OFFSET}%`} stopColor={colors.endColor} />
        </linearGradient>
      </defs>
    </svg>
  );
};
