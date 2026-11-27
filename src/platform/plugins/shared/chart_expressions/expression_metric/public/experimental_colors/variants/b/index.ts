/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import type { Control, Variant } from '../../types';
import { metricTileColors, metricValueColor, type BTargets } from './colors';
import { BDecorations } from './decorations';
import { bTargets } from './targets';

const controls: ReadonlyArray<Control<keyof BTargets>> = [
  {
    type: 'range',
    key: 'fill',
    label: i18n.translate('expressionMetricVis.experimentalColors.b.fillLabel', {
      defaultMessage: 'Fill',
    }),
    max: 100,
  },
  {
    type: 'range',
    key: 'ink',
    label: i18n.translate('expressionMetricVis.experimentalColors.b.inkLabel', {
      defaultMessage: 'Value',
    }),
    max: 106,
  },
  {
    type: 'range',
    key: 'fillInk',
    label: i18n.translate('expressionMetricVis.experimentalColors.b.fillInkLabel', {
      defaultMessage: 'Value on fill',
    }),
    max: 106,
  },
  {
    type: 'range',
    key: 'trend',
    label: i18n.translate('expressionMetricVis.experimentalColors.b.trendLabel', {
      defaultMessage: 'Trend area',
    }),
    max: 100,
  },
  {
    type: 'range',
    key: 'trendLine',
    label: i18n.translate('expressionMetricVis.experimentalColors.b.trendLineLabel', {
      defaultMessage: 'Trend line',
    }),
    max: 100,
  },
  {
    type: 'switch',
    key: 'neutralInk',
    label: i18n.translate('expressionMetricVis.experimentalColors.b.neutralInkLabel', {
      defaultMessage: 'Neutral value text',
    }),
  },
  {
    type: 'switch',
    key: 'showTrendLine',
    label: i18n.translate('expressionMetricVis.experimentalColors.b.showTrendLineLabel', {
      defaultMessage: 'Show the trend line',
    }),
  },
  {
    type: 'switch',
    key: 'trendGradient',
    label: i18n.translate('expressionMetricVis.experimentalColors.b.trendGradientLabel', {
      defaultMessage: 'Trend area gradient',
    }),
  },
  {
    type: 'range',
    key: 'noTrendExtraFill',
    label: i18n.translate('expressionMetricVis.experimentalColors.b.noTrendExtraFillLabel', {
      defaultMessage: 'No trend: extra fill',
    }),
    max: 20,
  },
];

/** Variant B: faint fills, the value in ink, and restyled trends. */
export const variantB: Variant = {
  targets: bTargets,
  controls,
  tile: ({ color, noColor, mode, ramp, hasTrend, isBackground }) => {
    if (noColor) return undefined;
    const targets = bTargets.get();
    if (!isBackground) {
      const valueColor = metricValueColor(color, mode, ramp, targets);
      return valueColor ? { valueColor } : undefined;
    }
    const colors = metricTileColors(color, mode, { ramp, hasTrend, targets });
    return (
      colors && {
        fill: colors.fill,
        valueColor: colors.ink,
        titleColor: colors.ink,
        bar: colors.bar,
      }
    );
  },
  Decorations: BDecorations,
};
