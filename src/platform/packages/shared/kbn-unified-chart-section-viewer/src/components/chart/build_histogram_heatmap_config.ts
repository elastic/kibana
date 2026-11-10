/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  calculateContrast,
  colorPalette,
  hexToRgb,
  isColorDark,
  makeHighContrastColor,
} from '@elastic/eui';
import type { LensHeatmapConfig } from '@kbn/lens-embeddable-utils';
import { LENS_HEATMAP_DEFAULT_COLOR_STEPS } from '@kbn/lens-common';
import {
  HISTOGRAM_BUCKET_COLUMN,
  HISTOGRAM_COUNT_COLUMN,
  createTimeBucketAggregation,
} from '../../common/utils';

type HeatmapColorSteps = Extract<
  NonNullable<LensHeatmapConfig['color']>,
  { type: 'dynamic' }
>['steps'];

/** Series colors below this are adjusted so the hottest cell stays visible. */
const MIN_SERIES_CONTRAST = 1.8;
const LIGHT_TARGET_CONTRAST = 2.2;
const DARK_TARGET_CONTRAST = 2.8;

/** Tints the series color toward the panel, keeping the hottest cell on the series color when it is already visible. */
const heatmapCellColors = (seriesColor: string, backgroundColor: string): string[] => {
  const backgroundRgb = hexToRgb(backgroundColor);
  const [red, green, blue] = backgroundRgb;
  const lightPanel = !isColorDark(red, green, blue);
  const seriesContrast = calculateContrast(hexToRgb(seriesColor), backgroundRgb);
  const strong =
    seriesContrast < MIN_SERIES_CONTRAST
      ? makeHighContrastColor(
          seriesColor,
          lightPanel ? LIGHT_TARGET_CONTRAST : DARK_TARGET_CONTRAST
        )(backgroundColor)
      : seriesColor;
  // Drop the panel-colored end. A dark panel drops more so the ramp sits lighter.
  const scaleLength = LENS_HEATMAP_DEFAULT_COLOR_STEPS + (lightPanel ? 2 : 3);

  return colorPalette([backgroundColor, strong], scaleLength).slice(
    scaleLength - LENS_HEATMAP_DEFAULT_COLOR_STEPS
  );
};

/** Spreads low-to-high colors evenly across a percentage scale Lens remaps to the data domain. */
const toPercentageColorSteps = (colors: readonly string[]): HeatmapColorSteps => {
  const step = 100 / colors.length;
  return colors.map((color, index) => {
    const gte = index * step;
    const end = (index + 1) * step;
    return index === colors.length - 1 ? { color, gte, lte: end } : { color, gte, lt: end };
  });
};

/** Builds a histogram heatmap with the same Lens config builder the XY charts use. */
export const buildHistogramHeatmapConfig = ({
  query,
  title,
  description,
  seriesColor,
  backgroundColor,
}: {
  query: string;
  title: string;
  description?: string;
  seriesColor: string;
  backgroundColor: string;
}): LensHeatmapConfig => ({
  chartType: 'heatmap',
  title,
  description,
  dataset: { esql: query },
  value: HISTOGRAM_COUNT_COLUMN,
  xAxis: createTimeBucketAggregation({}),
  breakdown: HISTOGRAM_BUCKET_COLUMN,
  legend: { show: false },
  axisLabel: { xAxis: true, yAxis: true },
  color: {
    type: 'dynamic',
    range: 'percentage',
    steps: toPercentageColorSteps(heatmapCellColors(seriesColor, backgroundColor)),
  },
  // Histogram ranges run high to low, matching the previous query sort.
  ySort: 'desc',
});
