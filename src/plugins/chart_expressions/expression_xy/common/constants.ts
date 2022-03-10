/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';

export const XY_CHART = 'lens_xy_chart';
export const Y_CONFIG = 'lens_xy_yConfig';
export const MULTITABLE = 'lens_multitable';
export const DATA_LAYER = 'lens_xy_data_layer';
export const LEGEND_CONFIG = 'lens_xy_legendConfig';
export const XY_CHART_RENDERER = 'lens_xy_chart_renderer';
export const GRID_LINES_CONFIG = 'lens_xy_gridlinesConfig';
export const TICK_LABELS_CONFIG = 'lens_xy_tickLabelsConfig';
export const AXIS_EXTENT_CONFIG = 'lens_xy_axisExtentConfig';
export const REFERENCE_LINE_LAYER = 'lens_xy_referenceLine_layer';
export const LABELS_ORIENTATION_CONFIG = 'lens_xy_labelsOrientationConfig';
export const AXIS_TITLES_VISIBILITY_CONFIG = 'lens_xy_axisTitlesVisibilityConfig';

export const LayerTypes = {
  DATA: 'data',
  REFERENCELINE: 'referenceLine',
} as const;

export const FittingFunctions = {
  NONE: 'None',
  ZERO: 'Zero',
  LINEAR: 'Linear',
  CARRY: 'Carry',
  LOOKAHEAD: 'Lookahead',
} as const;

export const YAxisModes = {
  AUTO: 'auto',
  LEFT: 'left',
  RIGHT: 'right',
  BOTTOM: 'bottom',
} as const;

export const AxisExtentModes = {
  FULL: 'full',
  CUSTOM: 'custom',
  DATA_BOUNDS: 'dataBounds',
} as const;

export const LineStyles = {
  SOLID: 'solid',
  DASHED: 'dashed',
  DOTTED: 'dotted',
} as const;

export const FillStyles = {
  NONE: 'none',
  ABOVE: 'above',
  BELOW: 'below',
} as const;

export const IconPositions = {
  AUTO: 'auto',
  LEFT: 'left',
  RIGHT: 'right',
  ABOVE: 'above',
  BELOW: 'below',
} as const;

export const SeriesTypes = {
  BAR: 'bar',
  LINE: 'line',
  AREA: 'area',
  BAR_STACKED: 'bar_stacked',
  AREA_STACKED: 'area_stacked',
  BAR_HORIZONTAL: 'bar_horizontal',
  BAR_PERCENTAGE_STACKED: 'bar_percentage_stacked',
  BAR_HORIZONTAL_STACKED: 'bar_horizontal_stacked',
  AREA_PERCENTAGE_STACKED: 'area_percentage_stacked',
  BAR_HORIZONTAL_PERCENTAGE_STACKED: 'bar_horizontal_percentage_stacked',
} as const;

export const YScaleTypes = {
  TIME: 'time',
  LINEAR: 'linear',
  LOG: 'log',
  SQRT: 'sqrt',
} as const;

export const XScaleTypes = {
  TIME: 'time',
  LINEAR: 'linear',
  ORDINAL: 'ordinal',
} as const;

export const XYCurveTypes = {
  LINEAR: 'LINEAR',
  CURVE_MONOTONE_X: 'CURVE_MONOTONE_X',
} as const;

export const ValueLabelModes = {
  HIDE: 'hide',
  INSIDE: 'inside',
  OUTSIDE: 'outside',
} as const;

export const fittingFunctionDefinitions = [
  {
    id: FittingFunctions.NONE,
    title: i18n.translate('xpack.lens.fittingFunctionsTitle.none', {
      defaultMessage: 'Hide',
    }),
    description: i18n.translate('xpack.lens.fittingFunctionsDescription.none', {
      defaultMessage: 'Do not fill gaps',
    }),
  },
  {
    id: FittingFunctions.ZERO,
    title: i18n.translate('xpack.lens.fittingFunctionsTitle.zero', {
      defaultMessage: 'Zero',
    }),
    description: i18n.translate('xpack.lens.fittingFunctionsDescription.zero', {
      defaultMessage: 'Fill gaps with zeros',
    }),
  },
  {
    id: FittingFunctions.LINEAR,
    title: i18n.translate('xpack.lens.fittingFunctionsTitle.linear', {
      defaultMessage: 'Linear',
    }),
    description: i18n.translate('xpack.lens.fittingFunctionsDescription.linear', {
      defaultMessage: 'Fill gaps with a line',
    }),
  },
  {
    id: FittingFunctions.CARRY,
    title: i18n.translate('xpack.lens.fittingFunctionsTitle.carry', {
      defaultMessage: 'Last',
    }),
    description: i18n.translate('xpack.lens.fittingFunctionsDescription.carry', {
      defaultMessage: 'Fill gaps with the last value',
    }),
  },
  {
    id: FittingFunctions.LOOKAHEAD,
    title: i18n.translate('xpack.lens.fittingFunctionsTitle.lookahead', {
      defaultMessage: 'Next',
    }),
    description: i18n.translate('xpack.lens.fittingFunctionsDescription.lookahead', {
      defaultMessage: 'Fill gaps with the next value',
    }),
  },
];
