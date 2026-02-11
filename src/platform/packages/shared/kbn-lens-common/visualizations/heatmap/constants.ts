/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { IconChartHeatmap } from '@kbn/chart-icons';
import { i18n } from '@kbn/i18n';
import type { RequiredPaletteParamTypes } from '@kbn/coloring';
import {
  FIXED_PROGRESSION,
  DEFAULT_CONTINUITY,
  DEFAULT_MIN_STOP,
  DEFAULT_MAX_STOP,
  DEFAULT_COLOR_STEPS,
} from '@kbn/coloring';

export const LENS_HEATMAP_ID = 'lnsHeatmap';

export const LENS_HEATMAP_CHART_SHAPES = {
  HEATMAP: 'heatmap',
} as const;

export const LENS_HEATMAP_CHART_NAMES = {
  heatmap: {
    shapeType: LENS_HEATMAP_CHART_SHAPES.HEATMAP,
    icon: IconChartHeatmap,
    label: i18n.translate('xpack.lens.heatmap.heatmapLabel', {
      defaultMessage: 'Heat map',
    }),
  },
};

export const LENS_HEATMAP_GROUP_ID = {
  X: 'x',
  Y: 'y',
  CELL: 'cell',
} as const;

export const HEATMAP_NAME = 'heatmap';
export const HEATMAP_LEGEND_NAME = 'heatmap_legend';
export const HEATMAP_GRID_NAME = 'heatmap_grid';

export const LENS_HEATMAP_DEFAULT_PALETTE_NAME = 'temperature';
export const LENS_HEATMAP_DEFAULT_PALETTE_PARAMS: RequiredPaletteParamTypes = {
  name: 'temperature',
  reverse: false,
  rangeType: 'percent',
  rangeMin: DEFAULT_MIN_STOP,
  rangeMax: DEFAULT_MAX_STOP,
  progression: FIXED_PROGRESSION,
  stops: [],
  steps: DEFAULT_COLOR_STEPS,
  colorStops: [],
  continuity: DEFAULT_CONTINUITY,
};
