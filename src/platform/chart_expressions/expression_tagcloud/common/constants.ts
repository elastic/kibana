/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export const PLUGIN_ID = 'expressionTagcloud';
export const PLUGIN_NAME = 'expressionTagcloud';

export const EXPRESSION_NAME = 'tagcloud';

export const ScaleOptions = {
  LINEAR: 'linear',
  LOG: 'log',
  SQUARE_ROOT: 'square root',
} as const;

export const Orientation = {
  SINGLE: 'single',
  RIGHT_ANGLED: 'right angled',
  MULTIPLE: 'multiple',
} as const;
