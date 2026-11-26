/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { pick } from 'lodash';
import type { DiscoverSessionApiEmbeddableOverrides } from '@kbn/as-code-discover-schema';
import { type SerializedTimeRange, type SerializedTitles } from '@kbn/presentation-publishing';
import type { SerializedDrilldowns } from '@kbn/embeddable-plugin/server';
import type { DiscoverSessionEmbeddableState } from '../../../common/embeddable/types';
import {
  fromStoredSearchEmbeddable,
  isDiscoverSessionEmbeddableByReferenceState,
  isSearchEmbeddableLegacyPanelState,
} from '../../../common/embeddable';
import { fromStoredTableSettings } from '../../../common/embeddable/transform_utils';
import type { DiscoverServices } from '../../build_services';
import { EDITABLE_PANEL_KEYS } from '../constants';
import type {
  SearchEmbeddableInputState,
  SearchEmbeddableRuntimeState,
  SearchEmbeddableSerializedAttributes,
  SearchEmbeddableStateManager,
} from '../types';
import {
  applyTableSettings,
  fromDiscoverSessionTab,
  getTableSettingsOverrides,
  toByValuePanelTab,
  toSearchEmbeddableAttributes,
  toSessionTabAttributes,
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
    const session = await discoverServices.savedSearch.getDiscoverSession(savedObjectId);
    const tabs = session.tabs.map(fromDiscoverSessionTab);
    const selectedTab = selectedTabId ? tabs.find(({ id }) => id === selectedTabId) : tabs[0];

    return {
      // A deleted selected tab shows a prompt, so the panel has no tab attributes to show
      ...(selectedTab && toSessionTabAttributes(selectedTab, overrides)),
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
    ...toSearchEmbeddableAttributes(tab),
    tab,
    ...panelState,
    nonPersistedDisplayOptions: serializedState.nonPersistedDisplayOptions,
  };
};

/** Reads the panel's table settings in the public panel format. */
export const toPanelTableSettings = (
  attributes: Partial<SearchEmbeddableSerializedAttributes>
): DiscoverSessionApiEmbeddableOverrides =>
  fromStoredTableSettings({
    columns: attributes.columns,
    grid: attributes.grid,
    sort: attributes.sort,
    rowHeight: attributes.rowHeight,
    headerRowHeight: attributes.headerRowHeight,
    rowsPerPage: attributes.rowsPerPage,
    sampleSize: attributes.sampleSize,
    density: attributes.density,
    documentsDisplayMode: attributes.documentsDisplayMode,
    jsonModeSettings: attributes.jsonModeSettings,
  });

/** Reads the table settings the panel shows in the public panel format. */
export const getPanelTableSettings = (
  stateManager: SearchEmbeddableStateManager
): DiscoverSessionApiEmbeddableOverrides =>
  toPanelTableSettings({
    columns: stateManager.columns.getValue(),
    grid: stateManager.grid.getValue(),
    sort: stateManager.sort.getValue(),
    rowHeight: stateManager.rowHeight.getValue(),
    headerRowHeight: stateManager.headerRowHeight.getValue(),
    rowsPerPage: stateManager.rowsPerPage.getValue(),
    sampleSize: stateManager.sampleSize.getValue(),
    density: stateManager.density.getValue(),
    documentsDisplayMode: stateManager.documentsDisplayMode.getValue(),
    jsonModeSettings: stateManager.jsonModeSettings.getValue(),
  });

export const serializeState = ({
  runtimeState,
  tableSettings,
  serializeTitles,
  serializeTimeRange,
  serializeDynamicActions,
  savedObjectId,
  selectedTabId,
}: {
  runtimeState: SearchEmbeddableRuntimeState;
  tableSettings: DiscoverSessionApiEmbeddableOverrides;
  serializeTitles: () => SerializedTitles;
  serializeTimeRange: () => SerializedTimeRange;
  serializeDynamicActions: () => SerializedDrilldowns;
  savedObjectId?: string;
  selectedTabId?: string;
}): DiscoverSessionEmbeddableState => {
  const selectedSessionTab = runtimeState.tabs?.find(({ id }) => id === selectedTabId);

  if (savedObjectId) {
    return {
      ...serializeTitles(),
      ...serializeTimeRange(),
      ...serializeDynamicActions?.(),
      ref_id: savedObjectId,
      selected_tab_id: selectedTabId,
      // A deleted tab or one without a Data View shows no table, so the overrides stay as they are
      overrides: selectedSessionTab?.tab
        ? getTableSettingsOverrides(selectedSessionTab.tab, tableSettings)
        : runtimeState.overrides ?? {},
    };
  }

  // Unlinking a linked panel turns its selected session tab into the by-value tab
  const tab = selectedSessionTab ? selectedSessionTab.tab : runtimeState.tab;

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
    tabs: [
      toByValuePanelTab(
        applyTableSettings(tab, tableSettings),
        selectedSessionTab?.inlineDataViewId
      ),
    ],
  };
};
