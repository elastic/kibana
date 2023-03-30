/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Observable } from 'rxjs';
import type { UnifiedHistogramInitializedApi, UnifiedHistogramUninitializedApi } from './container';

export type MockUnifiedHistogramApi = Omit<UnifiedHistogramUninitializedApi, 'initialized'> &
  Omit<UnifiedHistogramInitializedApi, 'initialized'> & { initialized: boolean };

export const createMockUnifiedHistogramApi = (
  { initialized }: { initialized: boolean } = { initialized: false }
) => {
  const api: MockUnifiedHistogramApi = {
    initialized,
    initialize: jest.fn(() => {
      api.initialized = true;
    }),
    state$: new Observable(),
    setChartHidden: jest.fn(),
    setTopPanelHeight: jest.fn(),
    setBreakdownField: jest.fn(),
    setColumns: jest.fn(),
    setTimeInterval: jest.fn(),
    setRequestParams: jest.fn(),
    setTotalHits: jest.fn(),
    refetch: jest.fn(),
  };
  return api;
};
