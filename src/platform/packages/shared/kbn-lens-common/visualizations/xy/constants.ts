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
 * Need to duplicate these icons from expression-xy to avoid circular dependencies in the config builder
 */
export const AvailableReferenceLineIcons = {
  EMPTY: 'empty',
  ASTERISK: 'asterisk',
  ALERT: 'warning',
  BELL: 'bell',
  BOLT: 'bolt',
  BUG: 'bug',
  CIRCLE: 'circle',
  EDITOR_COMMENT: 'comment',
  FLAG: 'flag',
  HEART: 'heart',
  MAP_MARKER: 'waypoint',
  PIN_FILLED: 'pinFill',
  STAR_EMPTY: 'star',
  STAR_FILLED: 'starFill',
  TAG: 'tag',
  TRIANGLE: 'triangle',
} as const;
