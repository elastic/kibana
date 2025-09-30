/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ThunkAction, ThunkDispatch } from '@reduxjs/toolkit';
import { configureStore } from '@reduxjs/toolkit';
import { metricsGridSlice } from './slices/metrics_grid_slice';

export const createReduxStore = () =>
  configureStore({
    reducer: metricsGridSlice.reducer,
    devTools: process.env.NODE_ENV !== 'production',
  });

export type InternalStateStore = ReturnType<typeof createReduxStore>;
export type RootState = ReturnType<InternalStateStore['getState']>;
export type AppDispatch = InternalStateStore['dispatch'];

type StateThunkAction<TReturn = void> = ThunkAction<
  TReturn,
  AppDispatch extends ThunkDispatch<infer TState, never, never> ? TState : never,
  AppDispatch extends ThunkDispatch<never, infer TExtra, never> ? TExtra : never,
  AppDispatch extends ThunkDispatch<never, never, infer TAction> ? TAction : never
>;

export type StateThunkActionCreator<TArgs extends unknown[] = [], TReturn = void> = (
  ...args: TArgs
) => StateThunkAction<TReturn>;
