/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  LensLegendConfig,
  LensSeriesLayer,
  LensXYConfig,
  LensYBoundsConfig,
} from '@kbn/lens-embeddable-utils';

/** Builds an XY series Lens config. */
export const buildXySeriesConfig = ({
  query,
  title,
  description,
  chartLayers,
  yBounds,
  legend,
  yAxisTitle,
}: {
  query: string;
  title: string;
  description?: string;
  chartLayers: LensSeriesLayer[];
  yBounds?: LensYBoundsConfig;
  legend?: LensLegendConfig;
  yAxisTitle?: string;
}): LensXYConfig => ({
  chartType: 'xy',
  description,
  dataset: {
    esql: query,
  },
  title,
  legend: legend ?? { show: false },
  axisTitleVisibility: {
    showXAxisTitle: false,
    showYAxisTitle: yAxisTitle !== undefined,
    showYRightAxisTitle: false,
  },
  yTitle: yAxisTitle,
  layers: chartLayers,
  fittingFunction: 'Linear',
  yBounds,
});
