/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UnifiedHistogramState } from '../services/state_service';

export const breakdownFieldSelector = (state: UnifiedHistogramState) => state.breakdownField;
export const chartHiddenSelector = (state: UnifiedHistogramState) => state.chartHidden;
export const timeIntervalSelector = (state: UnifiedHistogramState) => state.timeInterval;
export const topPanelHeightSelector = (state: UnifiedHistogramState) => state.topPanelHeight;
export const totalHitsResultSelector = (state: UnifiedHistogramState) => state.totalHitsResult;
export const totalHitsStatusSelector = (state: UnifiedHistogramState) => state.totalHitsStatus;
export const lensAdaptersSelector = (state: UnifiedHistogramState) => state.lensAdapters;
export const lensDataLoadingSelector$ = (state: UnifiedHistogramState) => state.dataLoading$;
