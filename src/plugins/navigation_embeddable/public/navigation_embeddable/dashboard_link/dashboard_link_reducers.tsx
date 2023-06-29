/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { WritableDraft } from 'immer/dist/types/types-external';
import { PayloadAction } from '@reduxjs/toolkit';
import { DashboardLinkReduxState } from './types';

export const dashboardLinkReducers = {
  setLoading: (state: WritableDraft<DashboardLinkReduxState>, action: PayloadAction<boolean>) => {
    state.output.loading = action.payload;
  },
  setCurrentDashboardId: (
    state: WritableDraft<DashboardLinkReduxState>,
    action: PayloadAction<string>
  ) => {
    // TODO: use this for when the dashboard is saved / renamed / etc.
    state.componentState.currentDashboardId = action.payload;
  },
  setDashboardTitle: (
    state: WritableDraft<DashboardLinkReduxState>,
    action: PayloadAction<string>
  ) => {
    state.componentState.dashboardTitle = action.payload;
  },
  setDashboardDescription: (
    state: WritableDraft<DashboardLinkReduxState>,
    action: PayloadAction<string>
  ) => {
    state.componentState.dashboardDescription = action.payload;
  },
};
