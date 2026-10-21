/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { LegendValue, Position } from '@elastic/charts';

export enum LegendSize {
  AUTO = 'auto',
  SMALL = 'small',
  MEDIUM = 'medium',
  LARGE = 'large',
  EXTRA_LARGE = 'xlarge',
}

export enum LegendLayout {
  List = 'list',
}

export function getLegendLayout({
  isInside,
  position,
  layout,
}: {
  isInside?: boolean;
  position?: Position;
  layout?: LegendLayout;
}): LegendLayout | undefined {
  if (isInside) {
    return undefined;
  }

  if (position !== 'top' && position !== 'bottom') {
    return undefined;
  }

  return layout === LegendLayout.List ? LegendLayout.List : undefined;
}

export const LegendSizeToPixels = {
  [LegendSize.AUTO]: undefined,
  [LegendSize.SMALL]: 80,
  [LegendSize.MEDIUM]: 130,
  [LegendSize.LARGE]: 180,
  [LegendSize.EXTRA_LARGE]: 230,
} as const;

/** Fallback for the shared chart expressions and the legacy Visualize editor when no size is set. */
export const DEFAULT_LEGEND_SIZE = LegendSize.MEDIUM;

/** Size Lens uses when no legend size is stored in the visualization state. */
export const LENS_DEFAULT_LEGEND_SIZE = LegendSize.AUTO;

/**
 * This is a shared type between XY Expression and Annotation plugins.
 * We've put it here to avoid a circular dependency between the two plugins.
 */
export type XYLegendValue = Extract<
  LegendValue,
  | 'currentAndLastValue'
  | 'lastValue'
  | 'lastNonNullValue'
  | 'average'
  | 'median'
  | 'max'
  | 'min'
  | 'firstValue'
  | 'firstNonNullValue'
  | 'total'
  | 'count'
  | 'distinctCount'
  | 'variance'
  | 'stdDeviation'
  | 'range'
  | 'difference'
  | 'differencePercent'
>;
