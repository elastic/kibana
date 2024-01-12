/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { UnifiedHistogramPublicPlugin } from './plugin';

export type {
  UnifiedHistogramApi,
  UnifiedHistogramContainerProps,
  UnifiedHistogramCreationOptions,
  UnifiedHistogramState,
  UnifiedHistogramStateOptions,
} from './container';
export {
  UnifiedHistogramContainer,
  getChartHidden,
  getTopPanelHeight,
  getBreakdownField,
  setChartHidden,
  setTopPanelHeight,
  setBreakdownField,
} from './container';
export type {
  UnifiedHistogramServices,
  UnifiedHistogramChartLoadEvent,
  UnifiedHistogramAdapters,
  ExternalVisContext,
} from './types';
export { UnifiedHistogramFetchStatus } from './types';
export {
  extractExternalCustomVisualizationFromSuggestion,
  toExternalVisContextJSONString,
  fromExternalVisContextJSONString,
} from './utils/external_custom_visualization';

export const plugin = () => new UnifiedHistogramPublicPlugin();
