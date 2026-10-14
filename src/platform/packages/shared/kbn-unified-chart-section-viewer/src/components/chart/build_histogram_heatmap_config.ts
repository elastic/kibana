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
import type { HeatmapConfigESQL } from '@kbn/lens-embeddable-utils';
import {
  HISTOGRAM_BUCKET_COLUMN,
  HISTOGRAM_COUNT_COLUMN,
  createTimeBucketAggregation,
} from '../../common/utils';
import type { HeatmapValueFormat } from '../../common/utils/metric_unit/get_heatmap_value_format';

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
type HeatmapSeriesColor = Extract<
  NonNullable<HeatmapConfigESQL['metric']['color']>,
  { type: 'dynamic'; range: 'percentage' }
>;

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
): HeatmapSeriesColor => {
  const steps = Array.from({ length: HEATMAP_COLOR_STEPS }, (_, index) => {
    const start = (index / HEATMAP_COLOR_STEPS) * 100;
    const end = ((index + 1) / HEATMAP_COLOR_STEPS) * 100;
    return {
      color: heatmapBandColor(seriesColor, colorMode, backgroundColor, index),
      gte: start,
      ...(index === HEATMAP_COLOR_STEPS - 1 ? { lte: end } : { lt: end }),
    };
  });

  return {
    type: 'dynamic',
    range: 'percentage',
    steps,
  };
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

/**
 * Builds the Lens API heatmap for a histogram distribution.
 * The older heatmap builder hides axis labels and forces the legend on, so this path does not use it.
 */
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
  valueFormat?: HeatmapValueFormat;
  /** Vis-sequence color for this chart, the same one the series chart would use. */
  seriesColor: string;
  colorMode: HeatmapColorMode;
  /** Panel color the cells sit on. Pale or dark series colors are shifted off this. */
  backgroundColor: string;
}): HeatmapConfigESQL => {
  return {
    type: 'heatmap',
    title,
    ...(description != null ? { description } : {}),
    sampling: 1,
    ignore_global_filters: false,
    data_source: {
      type: 'esql',
      query,
    },
    metric: {
      column: HISTOGRAM_COUNT_COLUMN,
      label: countLabel(),
      format: { type: 'number', compact: true, decimals: 0 },
      color: buildHistogramHeatmapColor(seriesColor, colorMode, backgroundColor),
    },
    x: {
      column: createTimeBucketAggregation({}),
      label: timeLabel(),
    },
    y: {
      column: HISTOGRAM_BUCKET_COLUMN,
      label: valueLabel(),
      ...(valueFormat ? { format: valueFormat } : {}),
    },
    axis: {
      x: {
        labels: { visible: true },
        title: { visible: false },
        scale: 'temporal',
      },
      y: {
        labels: { visible: true },
        title: { visible: false },
        sort: 'desc',
      },
    },
    legend: {
      visibility: 'hidden',
      position: 'right',
    },
    styling: {
      cells: {
        labels: { visible: false },
      },
    },
  };
};
