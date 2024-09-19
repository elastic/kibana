/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { configureStore } from '@reduxjs/toolkit';
import { dashboardStateSlice } from './dashboard_state_slice';

export const dashboardStateStore = configureStore({
  reducer: { dashboardStateReducer: dashboardStateSlice.reducer },
});

export type DashboardRootState = ReturnType<typeof dashboardStateStore.getState>;
export type DashboardDispatch = typeof dashboardStateStore.dispatch;
