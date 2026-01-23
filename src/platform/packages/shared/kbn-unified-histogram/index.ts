/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export type {
  UnifiedHistogramServices,
  UnifiedHistogramChartLoadEvent,
  UnifiedHistogramAdapters,
  UnifiedHistogramVisContext,
  UnifiedHistogramFetchParamsExternal,
} from './types';
export { UnifiedHistogramFetchStatus, UnifiedHistogramExternalVisContextStatus } from './types';

export {
  UnifiedBreakdownFieldSelector,
  type BreakdownFieldSelectorProps,
} from './components/chart/lazy';
export {
  UnifiedHistogramChart,
  type UnifiedHistogramChartProps,
  ChartSectionTemplate,
  type ChartSectionTemplateProps,
} from './components/chart';
export { UnifiedHistogramLayout, type UnifiedHistogramLayoutProps } from './components/layout';

export {
  useUnifiedHistogram,
  type UseUnifiedHistogramProps,
  type UnifiedHistogramApi,
  type UnifiedHistogramPartialLayoutProps,
} from './hooks/use_unified_histogram';

export { useStableCallback } from './hooks/use_stable_callback';

export type { UnifiedHistogramState } from './services/state_service';

export {
  getChartHidden,
  getTopPanelHeight,
  getBreakdownField,
  setChartHidden,
  setTopPanelHeight,
  setBreakdownField,
} from './utils/local_storage_utils';
export { canImportVisContext } from './utils/external_vis_context';
