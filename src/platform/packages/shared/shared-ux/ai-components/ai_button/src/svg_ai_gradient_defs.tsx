/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { AiGradientColors, SvgLinearGradientGeometry } from './gradient_types';

const ICON_GRADIENT_START_OFFSET = 16;
const ICON_GRADIENT_END_OFFSET = 83;

export interface SvgAiGradientDefsProps extends SvgLinearGradientGeometry {
  readonly gradientId: string;
  readonly colors: AiGradientColors;
}

export const SvgAiGradientDefs = ({
  gradientId,
  colors,
  gradientUnits,
  x1,
  y1,
  x2,
  y2,
}: SvgAiGradientDefsProps): JSX.Element => {
  return (
    <svg width="0" height="0" aria-hidden="true" focusable="false" style={{ position: 'absolute' }}>
      <defs>
        <linearGradient
          id={gradientId}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          gradientUnits={gradientUnits}
        >
          <stop offset={`${ICON_GRADIENT_START_OFFSET}%`} stopColor={colors.startColor} />
          <stop offset={`${ICON_GRADIENT_END_OFFSET}%`} stopColor={colors.endColor} />
        </linearGradient>
      </defs>
    </svg>
  );
};
