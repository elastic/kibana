/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DashboardItem } from '@kbn/dashboard-plugin/common/content_management';
import { PayloadAction } from '@reduxjs/toolkit';
import { WritableDraft } from 'immer/dist/types/types-external';
import { DashboardLink, NavigationEmbeddableReduxState } from './types';

export const navigationEmbeddableReducers = {
  setDashboardList: (
    state: WritableDraft<NavigationEmbeddableReduxState>,
    action: PayloadAction<DashboardItem[]>
  ) => {
    state.componentState.dashboardList = action.payload;
  },
  setCurrentDashboardId: (
    state: WritableDraft<NavigationEmbeddableReduxState>,
    action: PayloadAction<string>
  ) => {
    state.componentState.currentDashboardId = action.payload;
  },
  setDashboardCount: (
    state: WritableDraft<NavigationEmbeddableReduxState>,
    action: PayloadAction<number>
  ) => {
    state.componentState.totalDashboards = action.payload;
  },
  setDashboardLinks: (
    state: WritableDraft<NavigationEmbeddableReduxState>,
    action: PayloadAction<DashboardLink[]>
  ) => {
    state.componentState.dashboardLinks = action.payload;
  },
  addLink: (
    state: WritableDraft<NavigationEmbeddableReduxState>,
    action: PayloadAction<DashboardLink>
  ) => {
    if (!state.explicitInput.dashboardLinks) {
      state.explicitInput.dashboardLinks = [];
    }
    state.explicitInput.dashboardLinks.push({ id: action.payload.id, label: action.payload.label });
  },
};
