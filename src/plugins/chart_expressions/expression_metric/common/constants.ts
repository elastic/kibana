/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export const EXPRESSION_METRIC_NAME = 'metricVis';

export const LabelPosition = {
  BOTTOM: 'bottom',
  TOP: 'top',
} as const;

export const IconPositions = {
  AUTO: 'auto',
  LEFT: 'left',
  RIGHT: 'right',
  ABOVE: 'above',
  BELOW: 'below',
} as const;

export const IconBackgroundTypes = {
  NONE: 'none',
  SHADOW: 'shadow',
  COLOR: 'color',
} as const;
