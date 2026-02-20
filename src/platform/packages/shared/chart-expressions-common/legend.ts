/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { LegendValue } from '@elastic/charts';

export enum LegendSize {
  AUTO = 'auto',
  SMALL = 'small',
  MEDIUM = 'medium',
  LARGE = 'large',
  EXTRA_LARGE = 'xlarge',
}

export enum LegendLayout {
  Table = 'table',
  List = 'list',
}

export const LegendSizeToPixels = {
  [LegendSize.AUTO]: undefined,
  [LegendSize.SMALL]: 80,
  [LegendSize.MEDIUM]: 130,
  [LegendSize.LARGE]: 180,
  [LegendSize.EXTRA_LARGE]: 230,
} as const;

export const DEFAULT_LEGEND_SIZE = LegendSize.MEDIUM;

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
