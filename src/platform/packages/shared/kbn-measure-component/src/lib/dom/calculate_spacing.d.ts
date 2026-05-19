/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export interface SpacingLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  distance: number;
  orientation: 'horizontal' | 'vertical';
}
/**
 * Calculate spacing lines between two bounding rects.
 *
 * - **Separated elements**: shows the gap between nearest edges (horizontal, vertical, or both).
 * - **Containment** (one inside the other): shows distances from inner edges to outer edges.
 * - **Partial overlap**: no lines shown (ambiguous, not useful).
 */
export declare const calculateSpacingLines: (
  anchorRect: DOMRect,
  targetRect: DOMRect
) => SpacingLine[];
