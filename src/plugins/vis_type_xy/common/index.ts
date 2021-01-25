/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { $Values } from '@kbn/utility-types';

/**
 * Type of charts able to render
 */
export const ChartType = Object.freeze({
  Line: 'line' as const,
  Area: 'area' as const,
  Histogram: 'histogram' as const,
});
export type ChartType = $Values<typeof ChartType>;

/**
 * Type of xy visualizations
 */
export type XyVisType = ChartType | 'horizontal_bar';

export const LEGACY_CHARTS_LIBRARY = 'visualization:visualize:legacyChartsLibrary';
