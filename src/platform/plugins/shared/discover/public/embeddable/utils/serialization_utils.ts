/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { pick } from 'lodash';
import { type SerializedTimeRange, type SerializedTitles } from '@kbn/presentation-publishing';
import type { SerializedDrilldowns } from '@kbn/embeddable-plugin/server';
import type { DiscoverSessionEmbeddableState } from '../../../common/embeddable/types';
import {
  fromStoredSearchEmbeddable,
  isDiscoverSessionEmbeddableByReferenceState,
  isSearchEmbeddableLegacyPanelState,
} from '../../../common/embeddable';
import type { DiscoverServices } from '../../build_services';
import { EDITABLE_PANEL_KEYS } from '../constants';
import type {
  SearchEmbeddableInputState,
  SearchEmbeddablePanelTab,
  SearchEmbeddableRuntimeState,
} from '../types';
import {
  applyTableSettingOverrides,
  fromSessionApiTab,
  getTableSettingsOverrides,
  toByValuePanelTab,
} from './panel_tab';

export const deserializeState = async ({
  serializedState,
  discoverServices,
}: {
  serializedState: SearchEmbeddableInputState;
  discoverServices: DiscoverServices;
}): Promise<SearchEmbeddableRuntimeState> => {
  const apiState = isSearchEmbeddableLegacyPanelState(serializedState)
    ? fromStoredSearchEmbeddable(serializedState)
    : serializedState;
  // A legacy panel can keep its title and description only in its attributes, also when Dashboard
  // merges a tab returned from Discover over it
  const legacyAttributes = 'attributes' in serializedState ? serializedState.attributes : undefined;
  const {
    title = legacyAttributes?.title,
    description = legacyAttributes?.description,
    ...otherPanelState
  } = pick(serializedState, EDITABLE_PANEL_KEYS);
  const panelState = { ...otherPanelState, title, description };

  if (isDiscoverSessionEmbeddableByReferenceState(apiState)) {
    const { ref_id: savedObjectId, selected_tab_id: selectedTabId, overrides = {} } = apiState;
    // The panel does not read session controls, so their warnings do not apply to it
    const { data: session } = await discoverServices.discoverSessionClient.get(savedObjectId);
    const tabs = session.tabs.map(fromSessionApiTab);
    const selectedTab = selectedTabId ? tabs.find(({ id }) => id === selectedTabId) : tabs[0];

    return {
      // A deleted selected tab shows a prompt, so the panel has no tab to show
      panelTab: selectedTab?.tab
        ? {
            tab: applyTableSettingOverrides(selectedTab.tab, overrides),
            inlineDataViewId: selectedTab.inlineDataViewId,
          }
        : {},
      savedObjectId,
      savedObjectTitle: session.title,
      savedObjectDescription: session.description,
      selectedTabId: selectedTab?.id ?? selectedTabId,
      tabs,
      overrides,
      ...panelState,
    };
  }

  const [tab] = apiState.tabs;

  return {
    panelTab: { tab },
    ...panelState,
    nonPersistedDisplayOptions: serializedState.nonPersistedDisplayOptions,
  };
};

export const serializeState = ({
  runtimeState,
  panelTab,
  serializeTitles,
  serializeTimeRange,
  serializeDynamicActions,
  savedObjectId,
  selectedTabId,
}: {
  runtimeState: SearchEmbeddableRuntimeState;
  panelTab: SearchEmbeddablePanelTab;
  serializeTitles: () => SerializedTitles;
  serializeTimeRange: () => SerializedTimeRange;
  serializeDynamicActions: () => SerializedDrilldowns;
  savedObjectId?: string;
  selectedTabId?: string;
}): DiscoverSessionEmbeddableState => {
  const { tab, inlineDataViewId } = panelTab;

  if (savedObjectId) {
    const sessionTab = runtimeState.tabs?.find(({ id }) => id === selectedTabId)?.tab;

    return {
      ...serializeTitles(),
      ...serializeTimeRange(),
      ...serializeDynamicActions?.(),
      ref_id: savedObjectId,
      selected_tab_id: selectedTabId,
      // A deleted tab or one without a Data View shows no table, so the overrides stay as they are
      overrides:
        sessionTab && tab
          ? getTableSettingsOverrides(sessionTab, tab)
          : runtimeState.overrides ?? {},
    };
  }

  // Unlinking a linked panel turns the session tab it shows into the by-value tab
  if (!tab) {
    throw new Error('The selected tab of this panel no longer exists');
  }

  const { title, description, ...titleOptions } = serializeTitles() ?? {};

  return {
    ...serializeTimeRange(),
    ...serializeDynamicActions?.(),
    // An empty panel title is shown as empty, so only a missing one falls back to the session
    title: title ?? runtimeState.savedObjectTitle,
    description: description ?? runtimeState.savedObjectDescription,
    ...titleOptions,
    tabs: [toByValuePanelTab(tab, inlineDataViewId)],
  };
};
