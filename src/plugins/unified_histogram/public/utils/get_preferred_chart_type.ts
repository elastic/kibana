/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { PieVisualizationState, XYState } from '@kbn/lens-plugin/public';
import type { ChartType } from '@kbn/visualization-utils';
import type { UnifiedHistogramVisContext } from '../types';

const LENS_PREFIX = 'lns';

/*
 * This function is used to get the preferred chart type from the lens visAttributes.
 * For XY and Pie visualizations, the preferred chart type is stored in the state.
 * So for example, an XY chart can be area, line, stacked_bar, etc. and a Pie chart can be donut, pie, etc.
 */
export const getPreferredChartType = (visAttributes: UnifiedHistogramVisContext['attributes']) => {
  let preferredChartType = visAttributes?.visualizationType;

  if (preferredChartType === 'lnsXY') {
    preferredChartType = (visAttributes?.state?.visualization as XYState)?.preferredSeriesType;
  }
  if (preferredChartType === 'lnsPie') {
    preferredChartType = (visAttributes?.state?.visualization as PieVisualizationState)?.shape;
  }

  return preferredChartType.replace(LENS_PREFIX, '') as ChartType;
};
