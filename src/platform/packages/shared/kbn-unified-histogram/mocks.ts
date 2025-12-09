/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UnifiedHistogramApi } from './hooks/use_unified_histogram';
import { createStateService } from './services/state_service';
import { unifiedHistogramServicesMock } from './__mocks__/services';

export const createMockUnifiedHistogramApi = () => {
  const api: UnifiedHistogramApi = {
    state$: createStateService({
      services: unifiedHistogramServicesMock,
    }).state$,
    setChartHidden: jest.fn(),
    setTopPanelHeight: jest.fn(),
    setTotalHits: jest.fn(),
    fetch: jest.fn(),
  };
  return api;
};
