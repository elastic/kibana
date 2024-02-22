/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export {
  extractContainerType,
  extractVisualizationType,
  getOverridesFor,
  isOnAggBasedEditor,
} from './utils';
export type { Simplify, MakeOverridesSerializable, ChartSizeSpec, ChartSizeEvent } from './types';
export { isChartSizeEvent } from './types';
export { getColorCategories } from './color_categories';
