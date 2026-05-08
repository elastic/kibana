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
export const calculateSpacingLines = (anchorRect: DOMRect, targetRect: DOMRect): SpacingLine[] => {
  const hOverlap = hasHorizontalOverlap(anchorRect, targetRect);
  const vOverlap = hasVerticalOverlap(anchorRect, targetRect);

  // No overlap at all — elements are diagonal. Nothing to show.
  if (!hOverlap && !vOverlap) {
    return [];
  }

  // Overlap in both axes — one contains the other (or they partially overlap).
  if (hOverlap && vOverlap) {
    return containmentLines(anchorRect, targetRect);
  }

  // Overlap only vertically — they are side-by-side horizontally.
  if (vOverlap) {
    return horizontalGap(anchorRect, targetRect);
  }

  // Overlap only horizontally — they are stacked vertically.
  return verticalGap(anchorRect, targetRect);
};

const horizontalGap = (a: DOMRect, b: DOMRect): SpacingLine[] => {
  const [left, right] = a.right <= b.left ? [a, b] : [b, a];
  const distance = Math.round(right.left - left.right);
  if (distance <= 0) return [];

  // Adjacent: form a rectangle around the gap region
  const overlapTop = Math.max(a.top, b.top);
  const overlapBottom = Math.min(a.bottom, b.bottom);
  const y = (overlapTop + overlapBottom) / 2;

  return [
    {
      x1: left.right,
      y1: y,
      x2: right.left,
      y2: y,
      distance,
      orientation: 'horizontal',
    },
  ];
};

const verticalGap = (a: DOMRect, b: DOMRect): SpacingLine[] => {
  const [top, bottom] = a.bottom <= b.top ? [a, b] : [b, a];
  const distance = Math.round(bottom.top - top.bottom);
  if (distance <= 0) return [];

  // Adjacent: form a rectangle around the gap region
  const overlapLeft = Math.max(a.left, b.left);
  const overlapRight = Math.min(a.right, b.right);
  const x = (overlapLeft + overlapRight) / 2;

  return [
    {
      x1: x,
      y1: top.bottom,
      x2: x,
      y2: bottom.top,
      distance,
      orientation: 'vertical',
    },
  ];
};

/**
 * Show distances from inner element edges to outer element edges.
 * Only produces lines when one rect fully contains the other.
 */
const containmentLines = (a: DOMRect, b: DOMRect): SpacingLine[] => {
  const outer = contains(a, b) ? a : contains(b, a) ? b : null;
  if (!outer) return []; // partial overlap — no useful lines

  const inner = outer === a ? b : a;
  const lines: SpacingLine[] = [];
  const centerY = inner.top + inner.height / 2;
  const centerX = inner.left + inner.width / 2;

  const leftDist = Math.round(inner.left - outer.left);
  if (leftDist > 0) {
    lines.push({
      x1: outer.left,
      y1: centerY,
      x2: inner.left,
      y2: centerY,
      distance: leftDist,
      orientation: 'horizontal',
    });
  }

  const rightDist = Math.round(outer.right - inner.right);
  if (rightDist > 0) {
    lines.push({
      x1: inner.right,
      y1: centerY,
      x2: outer.right,
      y2: centerY,
      distance: rightDist,
      orientation: 'horizontal',
    });
  }

  const topDist = Math.round(inner.top - outer.top);
  if (topDist > 0) {
    lines.push({
      x1: centerX,
      y1: outer.top,
      x2: centerX,
      y2: inner.top,
      distance: topDist,
      orientation: 'vertical',
    });
  }

  const bottomDist = Math.round(outer.bottom - inner.bottom);
  if (bottomDist > 0) {
    lines.push({
      x1: centerX,
      y1: inner.bottom,
      x2: centerX,
      y2: outer.bottom,
      distance: bottomDist,
      orientation: 'vertical',
    });
  }

  return lines;
};

const contains = (outer: DOMRect, inner: DOMRect): boolean =>
  outer.left <= inner.left &&
  outer.right >= inner.right &&
  outer.top <= inner.top &&
  outer.bottom >= inner.bottom;

const hasVerticalOverlap = (a: DOMRect, b: DOMRect): boolean =>
  a.top < b.bottom && a.bottom > b.top;

const hasHorizontalOverlap = (a: DOMRect, b: DOMRect): boolean =>
  a.left < b.right && a.right > b.left;
