/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const YAxisModes = {
  AUTO: 'auto',
  LEFT: 'left',
  RIGHT: 'right',
  BOTTOM: 'bottom',
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

/**
 * XY series subtypes that default `includeEmptyRows` off for `date_histogram`.
 */
export const BAR_SERIES_TYPES = [
  SeriesTypes.BAR,
  SeriesTypes.BAR_STACKED,
  SeriesTypes.BAR_PERCENTAGE_STACKED,
  SeriesTypes.BAR_HORIZONTAL,
  SeriesTypes.BAR_HORIZONTAL_STACKED,
  SeriesTypes.BAR_HORIZONTAL_PERCENTAGE_STACKED,
] as const;

const barSeriesTypeSet = new Set<string>(BAR_SERIES_TYPES);

/**
 * Returns true when the XY subtype belongs to the bar family.
 */
export const isBarSeriesType = (
  seriesType: string | null | undefined
): seriesType is (typeof BAR_SERIES_TYPES)[number] =>
  typeof seriesType === 'string' && barSeriesTypeSet.has(seriesType);

/**
 * Need to duplicate these icons from expression-xy to avoid circular dependencies in the config builder
 */
export const AvailableReferenceLineIcons = {
  EMPTY: 'empty',
  ASTERISK: 'asterisk',
  ALERT: 'alert',
  BELL: 'bell',
  BOLT: 'bolt',
  BUG: 'bug',
  CIRCLE: 'circle',
  EDITOR_COMMENT: 'editorComment',
  FLAG: 'flag',
  HEART: 'heart',
  MAP_MARKER: 'mapMarker',
  PIN_FILLED: 'pinFilled',
  STAR_EMPTY: 'starEmpty',
  STAR_FILLED: 'starFilled',
  TAG: 'tag',
  TRIANGLE: 'triangle',
} as const;
