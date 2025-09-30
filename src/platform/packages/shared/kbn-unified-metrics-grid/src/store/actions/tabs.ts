/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { differenceBy } from 'lodash';
import type { ChartSectionProps } from '@kbn/unified-histogram/types';
import type { StateThunkActionCreator } from '..';
import { metricsGridSlice } from '../slices/metrics_grid_slice';
import { selectAllTabIds } from '../selectors/tabs';
import type { MetricsExperienceTabState } from '../types';
export const initializeTabs: StateThunkActionCreator<
  [tabsState: Pick<ChartSectionProps, 'tabsState'>]
> = (params) => (dispatch, getState) => {
  const state = getState();
  const previousTabs = selectAllTabIds(state);
  const removedTabs = differenceBy(previousTabs, params.tabsState.allIds, (id) => id);
  const addedTabs = differenceBy(params.tabsState.allIds, previousTabs, (id) => id);

  const { getTabById, allIds } = params.tabsState;

  const newTabsState: Record<string, MetricsExperienceTabState> = {};
  for (const addedTabId of addedTabs) {
    const discoverTabItem = getTabById(addedTabId);

    if (discoverTabItem.duplicatedFromId) {
      newTabsState[addedTabId] = state.tabs.byId[discoverTabItem.duplicatedFromId];
    } else {
      newTabsState[addedTabId] = {
        currentPage: 0,
        searchTerm: '',
        isFullscreen: false,
        dimensions: [],
        valueFilters: [],
      };
    }
  }

  dispatch(
    metricsGridSlice.actions.setTabs({
      allIds,
      removedTabIds: removedTabs,
      addedTabsState: newTabsState,
    })
  );
};
