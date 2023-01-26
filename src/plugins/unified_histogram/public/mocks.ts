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

export const createMockUnifiedHistogramApi = () => {
  const api: MockUnifiedHistogramApi = {
    initialized: false,
    initialize: jest.fn(() => {
      api.initialized = true;
    }),
    getState$: jest.fn(() => new Observable()),
    updateState: jest.fn(),
    refetch: jest.fn(),
  };
  return api;
};
