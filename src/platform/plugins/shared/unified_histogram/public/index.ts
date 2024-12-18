/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { UnifiedHistogramPublicPlugin } from './plugin';

export type { BreakdownFieldSelectorProps } from './chart/lazy';
export { UnifiedBreakdownFieldSelector } from './chart/lazy';

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
  UnifiedHistogramVisContext,
} from './types';
export { UnifiedHistogramFetchStatus, UnifiedHistogramExternalVisContextStatus } from './types';
export { canImportVisContext } from './utils/external_vis_context';

export const plugin = () => new UnifiedHistogramPublicPlugin();
