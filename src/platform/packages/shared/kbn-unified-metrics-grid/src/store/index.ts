/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { configureStore } from '@reduxjs/toolkit';
import { metricsGridSlice } from './slices/metrics_grid_slice';

export const createReduxStore = () =>
  configureStore({
    reducer: {
      metricsGrid: metricsGridSlice.reducer,
    },
    devTools: process.env.NODE_ENV !== 'production',
  });

export type InternalStateStore = ReturnType<typeof createReduxStore>;
export type RootState = ReturnType<InternalStateStore['getState']>;
export type AppDispatch = InternalStateStore['dispatch'];
