/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { v4 as uuidv4 } from 'uuid';
import { WritableDraft } from 'immer/dist/types/types-external';

import { PayloadAction } from '@reduxjs/toolkit';

import {
  DashboardItem,
  DashboardLink,
  ExternalLink,
  NavigationContainerComponentState,
  NavigationContainerReduxState,
} from '../types';

export const navigationEmbeddableReducers = {
  setLoading: (
    state: WritableDraft<NavigationContainerReduxState>,
    action: PayloadAction<boolean>
  ) => {
    state.output.loading = action.payload;
  },
  setCanEdit: (
    state: WritableDraft<NavigationContainerReduxState>,
    action: PayloadAction<boolean>
  ) => {
    state.componentState.canEdit = action.payload;
  },
  setDashboardList: (
    state: WritableDraft<NavigationContainerReduxState>,
    action: PayloadAction<DashboardItem[]>
  ) => {
    state.componentState.dashboardList = action.payload;
  },
  setCurrentDashboard: (
    state: WritableDraft<NavigationContainerReduxState>,
    action: PayloadAction<DashboardLink | undefined>
  ) => {
    state.componentState.currentDashboard = action.payload;
  },
  setDashboardCount: (
    state: WritableDraft<NavigationContainerReduxState>,
    action: PayloadAction<number>
  ) => {
    state.componentState.totalDashboards = action.payload;
  },
  setLinks: (
    state: WritableDraft<NavigationContainerReduxState>,
    action: PayloadAction<NavigationContainerComponentState['links']>
  ) => {
    state.componentState.links = action.payload;
  },
  addDashboardLink: (
    state: WritableDraft<NavigationContainerReduxState>,
    action: PayloadAction<DashboardLink>
  ) => {
    if (!state.explicitInput.links) {
      state.explicitInput.links = {};
    }
    state.explicitInput.links[uuidv4()] = {
      id: action.payload.id,
      label: action.payload.label,
      order: Object.keys(state.explicitInput.links).length + 1,
    };
  },
  addExternalLink: (
    state: WritableDraft<NavigationContainerReduxState>,
    action: PayloadAction<ExternalLink>
  ) => {
    if (!state.explicitInput.links) {
      state.explicitInput.links = {};
    }
    state.explicitInput.links[uuidv4()] = {
      ...action.payload,
      order: Object.keys(state.explicitInput.links).length + 1,
    };
  },
};
