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
import { ViewMode } from '@kbn/embeddable-plugin/public';

import {
  DashboardItem,
  DashboardLink,
  ExternalLink,
  NavigationEmbeddableComponentState,
  NavigationEmbeddableReduxState,
} from './types';

export const navigationEmbeddableReducers = {
  setLoading: (
    state: WritableDraft<NavigationEmbeddableReduxState>,
    action: PayloadAction<boolean>
  ) => {
    state.output.loading = action.payload;
  },
  setViewMode: (
    state: WritableDraft<NavigationEmbeddableReduxState>,
    action: PayloadAction<ViewMode | undefined>
  ) => {
    state.componentState.viewMode = action.payload;
  },
  setDashboardList: (
    state: WritableDraft<NavigationEmbeddableReduxState>,
    action: PayloadAction<DashboardItem[]>
  ) => {
    state.componentState.dashboardList = action.payload;
  },
  setCurrentDashboard: (
    state: WritableDraft<NavigationEmbeddableReduxState>,
    action: PayloadAction<DashboardLink | undefined>
  ) => {
    state.componentState.currentDashboard = action.payload;
  },
  setDashboardCount: (
    state: WritableDraft<NavigationEmbeddableReduxState>,
    action: PayloadAction<number>
  ) => {
    state.componentState.totalDashboards = action.payload;
  },
  setLinks: (
    state: WritableDraft<NavigationEmbeddableReduxState>,
    action: PayloadAction<NavigationEmbeddableComponentState['links']>
  ) => {
    state.componentState.links = action.payload;
  },
  addDashboardLink: (
    state: WritableDraft<NavigationEmbeddableReduxState>,
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
    state: WritableDraft<NavigationEmbeddableReduxState>,
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
