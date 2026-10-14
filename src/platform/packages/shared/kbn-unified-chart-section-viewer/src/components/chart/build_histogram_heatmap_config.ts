/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { makeHighContrastColor, shade, tint, type UseEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type {
  LensBaseLayer,
  LensHeatmapColorStep,
  LensHeatmapConfig,
} from '@kbn/lens-embeddable-utils';
import {
  HISTOGRAM_BUCKET_COLUMN,
  HISTOGRAM_COUNT_COLUMN,
  createTimeBucketAggregation,
} from '../../common/utils';

/** Same band count the named sequential palettes use. */
const HEATMAP_COLOR_STEPS = 5;
/**
 * Minimum contrast of the strongest light-theme band against the panel.
 * Lower than text contrast so a pale series color moves just enough to stay the same hue.
 */
const HEATMAP_MIN_CONTRAST = 2.5;
/** How far the lowest light-theme band mixes toward white. */
const LIGHT_LOW_BAND_WASH = 0.7;
/**
 * Dark theme keeps a wide gap between low and high counts.
 * Low counts shade toward the panel; high counts lift toward white so the top band stays bright.
 */
const DARK_LOW_SHADE = 0.45;
const DARK_HIGH_TINT = 0.4;

type HeatmapColorMode = UseEuiTheme['colorMode'];

const heatmapBandColor = (
  seriesColor: string,
  colorMode: HeatmapColorMode,
  backgroundColor: string,
  index: number
) => {
  const readable = makeHighContrastColor(seriesColor, HEATMAP_MIN_CONTRAST)(backgroundColor);
  const intensity = index / (HEATMAP_COLOR_STEPS - 1);
  if (colorMode === 'DARK') {
    const shadeAmount = DARK_LOW_SHADE * (1 - intensity);
    const tintAmount = DARK_HIGH_TINT * intensity;
    return tint(shade(readable, shadeAmount), tintAmount);
  }
  const wash = LIGHT_LOW_BAND_WASH * (1 - intensity);
  return wash === 0 ? readable : tint(readable, wash);
};

/** Percentage scale in the chart series color, shifted off the panel when that hue would disappear. */
export const buildHistogramHeatmapColor = (
  seriesColor: string,
  colorMode: HeatmapColorMode,
  backgroundColor: string
): LensHeatmapColorStep[] => {
  const steps = Array.from({ length: HEATMAP_COLOR_STEPS }, (_, index) => {
    const start = (index / HEATMAP_COLOR_STEPS) * 100;
    const end = ((index + 1) / HEATMAP_COLOR_STEPS) * 100;
    return {
      color: heatmapBandColor(seriesColor, colorMode, backgroundColor, index),
      gte: start,
      ...(index === HEATMAP_COLOR_STEPS - 1 ? { lte: end } : { lt: end }),
    };
  });

  return steps;
};

const timeLabel = () =>
  i18n.translate('metricsExperience.heatmap.timeLabel', {
    defaultMessage: 'Time',
  });

const valueLabel = () =>
  i18n.translate('metricsExperience.heatmap.valueLabel', {
    defaultMessage: 'Value',
  });

const countLabel = () =>
  i18n.translate('metricsExperience.heatmap.countLabel', {
    defaultMessage: 'Count',
  });

/** Builds a histogram heatmap with the same Lens config builder the XY charts use. */
export const buildHistogramHeatmapConfig = ({
  query,
  title,
  description,
  valueFormat,
  seriesColor,
  colorMode,
  backgroundColor,
}: {
  query: string;
  title: string;
  description?: string;
  /** Same column format the XY series axis uses for this metric's unit. */
  valueFormat?: Pick<LensBaseLayer, 'format' | 'decimals' | 'fromUnit' | 'toUnit'>;
  /** Vis-sequence color for this chart, the same one the series chart would use. */
  seriesColor: string;
  colorMode: HeatmapColorMode;
  /** Panel color the cells sit on. Pale or dark series colors are shifted off this. */
  backgroundColor: string;
}): LensHeatmapConfig => {
  return {
    chartType: 'heatmap',
    title,
    ...(description != null ? { description } : {}),
    dataset: {
      esql: query,
    },
    value: HISTOGRAM_COUNT_COLUMN,
    label: countLabel(),
    format: 'number',
    decimals: 0,
    compactValues: true,
    xAxis: {
      type: 'dateHistogram',
      field: createTimeBucketAggregation({}),
    },
    breakdown: HISTOGRAM_BUCKET_COLUMN,
    ...(valueFormat ? { breakdownFormat: valueFormat } : {}),
    legend: { show: false, position: 'right' },
    xAxisOptions: { showLabels: true, label: timeLabel() },
    yAxisOptions: { showLabels: true, sort: 'desc', label: valueLabel() },
    colorSteps: buildHistogramHeatmapColor(seriesColor, colorMode, backgroundColor),
  };
};
