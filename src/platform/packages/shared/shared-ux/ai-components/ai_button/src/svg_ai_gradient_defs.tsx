/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

export interface SvgAiGradientDefsProps {
  readonly gradientId: string;
  readonly startColor: string;
  readonly endColor: string;
  readonly startOffsetPercent?: number;
  readonly endOffsetPercent?: number;
}

export const SvgAiGradientDefs = ({
  gradientId,
  startColor,
  endColor,
  startOffsetPercent = 0,
  endOffsetPercent = 100,
}: SvgAiGradientDefsProps) => {
  // SVG icons need gradient defs to fill vector paths with multiple colors.
  // CSS/background gradients style boxes, but defs color the actual icon shape.
  return (
    <svg width="0" height="0" aria-hidden="true" focusable="false" style={{ position: 'absolute' }}>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset={`${startOffsetPercent}%`} stopColor={startColor} />
          <stop offset={`${endOffsetPercent}%`} stopColor={endColor} />
        </linearGradient>
      </defs>
    </svg>
  );
};
