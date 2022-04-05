/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export const XY_VIS = 'xyVis';
export const LAYERED_XY_VIS = 'layeredXyVis';
export const Y_CONFIG = 'yConfig';
export const AXIS_CONFIG = 'axisConfig';
export const MULTITABLE = 'lens_multitable';
export const DATA_LAYER = 'dataLayer';
export const EXTENDED_DATA_LAYER = 'extendedDataLayer';
export const LEGEND_CONFIG = 'legendConfig';
export const XY_VIS_RENDERER = 'xyVis';
export const GRID_LINES_CONFIG = 'gridlinesConfig';
export const ANNOTATION_LAYER = 'annotationLayer';
export const TICK_LABELS_CONFIG = 'tickLabelsConfig';
export const AXIS_EXTENT_CONFIG = 'axisExtentConfig';
export const REFERENCE_LINE_LAYER = 'referenceLineLayer';
export const EXTENDED_REFERENCE_LINE_LAYER = 'extendedReferenceLineLayer';
export const EXTENDED_ANNOTATION_LAYER = 'extendedAnnotationLayer';
export const LABELS_ORIENTATION_CONFIG = 'labelsOrientationConfig';
export const AXIS_TITLES_VISIBILITY_CONFIG = 'axisTitlesVisibilityConfig';

export const LayerTypes = {
  DATA: 'data',
  REFERENCELINE: 'referenceLine',
  ANNOTATIONS: 'annotations',
} as const;

export const FittingFunctions = {
  NONE: 'None',
  ZERO: 'Zero',
  LINEAR: 'Linear',
  CARRY: 'Carry',
  LOOKAHEAD: 'Lookahead',
} as const;

export const EndValues = {
  NONE: 'None',
  ZERO: 'Zero',
  NEAREST: 'Nearest',
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
