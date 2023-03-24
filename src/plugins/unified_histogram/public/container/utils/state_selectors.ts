/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { UnifiedHistogramState } from '../services/state_service';

export const breakdownFieldSelector = (state: UnifiedHistogramState) => state.breakdownField;
export const columnsSelector = (state: UnifiedHistogramState) => state.columns;
export const chartHiddenSelector = (state: UnifiedHistogramState) => state.chartHidden;
export const dataViewSelector = (state: UnifiedHistogramState) => state.dataView;
export const filtersSelector = (state: UnifiedHistogramState) => state.filters;
export const querySelector = (state: UnifiedHistogramState) => state.query;
export const requestAdapterSelector = (state: UnifiedHistogramState) => state.requestAdapter;
export const searchSessionIdSelector = (state: UnifiedHistogramState) => state.searchSessionId;
export const timeIntervalSelector = (state: UnifiedHistogramState) => state.timeInterval;
export const timeRangeSelector = (state: UnifiedHistogramState) => state.timeRange;
export const topPanelHeightSelector = (state: UnifiedHistogramState) => state.topPanelHeight;
export const totalHitsResultSelector = (state: UnifiedHistogramState) => state.totalHitsResult;
export const totalHitsStatusSelector = (state: UnifiedHistogramState) => state.totalHitsStatus;
export const currentSuggestionSelector = (state: UnifiedHistogramState) => state.currentSuggestion;
