/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataViewSpec } from '@kbn/data-views-plugin/common';
import type { DiscoverSessionTab } from '@kbn/saved-search-plugin/common';
import type { TabItem } from '@kbn/unified-tabs';
import type { DiscoverDataSource } from '../../../../../common/data_sources';
import { createDataViewDataSource, isDataViewSource } from '../../../../../common/data_sources';
import {
  bindUnreferencedAppFilters,
  getInlineDataViewIdentity,
  normalizeInlineSearchSource,
  remapFilterDataViewIds,
  type DataViewIdMap,
  type InlineDataViewIdentity,
} from '../../../../../common/session/inline_data_view_references';
import {
  createInlineDataViewIdMap,
  withOwnInlineDataViewId,
} from '../../../../../common/session/inline_data_view_id_compatibility';
import type {
  DiscoverAppState,
  RecentlyClosedTabState,
  TabState,
  TabStateGlobalState,
} from '../redux/types';
import { DEFAULT_TAB_STATE } from '../redux/constants';

/** A tab whose document spec has no ID, with the views its unreferenced app filters may target. */
export interface ConventionalTab {
  documentId: string;
  viewIds: ReadonlySet<string>;
}

export interface NormalizedInlineDataViewIds {
  sessionTabs: DiscoverSessionTab[];
  openTabs: TabState[];
  closedTabs: RecentlyClosedTabState[];
  defaultTabState: Omit<TabState, keyof TabItem>;
  navigationDataViewSpec: DataViewSpec | undefined;
  /** The derived ID of the navigation view when it is an inline view. */
  navigationInlineId: string | undefined;
  /** Translates references owned by the navigation, such as its default app state. */
  navigationIdMap: DataViewIdMap;
  /** Translates spec-less references, such as URL state; ambiguous IDs are left out. */
  dataViewIdMap: DataViewIdMap;
  /** Tabs following the API convention, where filters without a reference target the tab view. */
  conventionalTabs: ReadonlyMap<string, ConventionalTab>;
}

/** Replaces exact Data View references in the data source and filters of an app state. */
export const translateAppStateDataViewIds = (
  appState: DiscoverAppState,
  idMap: DataViewIdMap
): DiscoverAppState => {
  const { dataSource, filters } = appState;
  const translatedState = { ...appState };

  if (isDataViewSource(dataSource)) {
    const dataViewId = idMap.get(dataSource.dataViewId);
    if (dataViewId !== undefined) {
      translatedState.dataSource = createDataViewDataSource({ dataViewId });
    }
  }

  if (filters) {
    translatedState.filters = remapFilterDataViewIds(filters, idMap);
  }

  const isUnchanged =
    translatedState.dataSource === dataSource && translatedState.filters === filters;

  return isUnchanged ? appState : translatedState;
};

const translateGlobalStateDataViewIds = (
  globalState: TabStateGlobalState,
  idMap: DataViewIdMap
): TabStateGlobalState => {
  const { filters } = globalState;
  if (!filters) {
    return globalState;
  }

  const translatedFilters = remapFilterDataViewIds(filters, idMap);
  if (translatedFilters === filters) {
    return globalState;
  }

  return { ...globalState, filters: translatedFilters };
};

// Without a data source, Discover uses the view of the saved tab.
const getAppStateViewId = (dataSource: DiscoverDataSource | undefined, documentId: string) => {
  if (dataSource === undefined) {
    return documentId;
  }

  if (!isDataViewSource(dataSource)) {
    return undefined;
  }

  return dataSource.dataViewId;
};

const bindConventionalAppFilters = (
  appState: DiscoverAppState,
  targetId: string | undefined,
  viewIds: ReadonlySet<string>
): DiscoverAppState => {
  const { filters } = appState;
  if (!filters || targetId === undefined || !viewIds.has(targetId)) {
    return appState;
  }

  const boundFilters = bindUnreferencedAppFilters(filters, targetId);

  return boundFilters === filters ? appState : { ...appState, filters: boundFilters };
};

// The convention applies when the local spec or the document spec of the same tab has no ID.
const followsApiConvention = (
  identity: InlineDataViewIdentity | undefined,
  conventionalTab: ConventionalTab | undefined
) => {
  if (!identity) {
    return false;
  }

  return !identity.dataView.id || conventionalTab !== undefined;
};

const normalizeInitialInternalState = (
  initialInternalState: TabState['initialInternalState'],
  options: Omit<Parameters<typeof normalizeInlineSearchSource>[0], 'searchSource'>
) => {
  const searchSource = initialInternalState?.serializedSearchSource;
  if (!initialInternalState || !searchSource) {
    return initialInternalState;
  }

  const serializedSearchSource = normalizeInlineSearchSource({ ...options, searchSource });
  if (serializedSearchSource === searchSource) {
    return initialInternalState;
  }

  return { ...initialInternalState, serializedSearchSource };
};

const normalizeTabState = <T extends Omit<TabState, keyof TabItem>>({
  tab,
  identity,
  conventionalTab,
  dataViewIdMap,
}: {
  tab: T;
  identity: InlineDataViewIdentity | undefined;
  conventionalTab?: ConventionalTab;
  dataViewIdMap: DataViewIdMap;
}): T => {
  const idMap = withOwnInlineDataViewId(identity, dataViewIdMap);
  const { initialInternalState, appState, previousAppState, globalState } = tab;
  const followsConvention = followsApiConvention(identity, conventionalTab);
  const normalizedInternalState = normalizeInitialInternalState(initialInternalState, {
    identity,
    ownDataViewIdMap: idMap,
    dataViewIdMap,
    bindUnreferencedFilters: followsConvention,
  });

  const normalizeAppState = (state: DiscoverAppState) => {
    const translatedState = translateAppStateDataViewIds(state, idMap);
    if (!identity || !followsConvention) {
      return translatedState;
    }

    const documentId = conventionalTab?.documentId ?? identity.id;
    const viewIds = new Set([identity.id, documentId]);

    return bindConventionalAppFilters(
      translatedState,
      getAppStateViewId(translatedState.dataSource, documentId),
      viewIds
    );
  };
  const normalizedAppState = normalizeAppState(appState);
  const normalizedPreviousAppState = normalizeAppState(previousAppState);
  const normalizedGlobalState = translateGlobalStateDataViewIds(globalState, dataViewIdMap);

  if (
    normalizedInternalState === initialInternalState &&
    normalizedAppState === appState &&
    normalizedPreviousAppState === previousAppState &&
    normalizedGlobalState === globalState
  ) {
    return tab;
  }

  return {
    ...tab,
    initialInternalState: normalizedInternalState,
    appState: normalizedAppState,
    previousAppState: normalizedPreviousAppState,
    globalState: normalizedGlobalState,
  };
};

// Navigation can carry a saved view's full spec, which must still be loaded by its stored ID.
const getNavigationDataViewIdentity = (
  spec: DataViewSpec | undefined,
  savedDataViewIds: readonly string[]
): InlineDataViewIdentity | undefined => {
  if (spec?.id && savedDataViewIds.includes(spec.id)) {
    return undefined;
  }

  return getInlineDataViewIdentity({ index: spec });
};

// An inline navigation view takes the ID derived from its spec; other views keep their own.
const normalizeNavigationDataViewSpec = (
  spec: DataViewSpec | undefined,
  identity: InlineDataViewIdentity | undefined
) => {
  if (!identity) {
    return spec;
  }

  return { ...identity.dataView, id: identity.id };
};

/**
 * Gives every inline view the ID derived from its own spec before Discover consumes any state,
 * translating only references whose previous ID maps to a single spec.
 */
export const normalizeInlineDataViewIds = ({
  sessionTabs,
  openTabs,
  closedTabs,
  defaultTabState = DEFAULT_TAB_STATE,
  openTabsFromSession,
  navigationDataViewSpec,
  savedDataViewIds,
}: {
  sessionTabs: DiscoverSessionTab[];
  openTabs: TabState[];
  closedTabs: RecentlyClosedTabState[];
  /** The fallback tab can contain a by-value panel, including its legacy references. */
  defaultTabState?: Omit<TabState, keyof TabItem>;
  /** Whether the open tabs were stored for the session, the only tabs its convention applies to. */
  openTabsFromSession: boolean;
  navigationDataViewSpec: DataViewSpec | undefined;
  /** Saved views already known to the loader, including navigation specs without a version. */
  savedDataViewIds: readonly string[];
}): NormalizedInlineDataViewIds => {
  const getLocalIdentity = (tab: Omit<TabState, keyof TabItem>) =>
    getInlineDataViewIdentity(tab.initialInternalState?.serializedSearchSource);
  const sessionIdentities = sessionTabs.map((tab) =>
    getInlineDataViewIdentity(tab.serializedSearchSource)
  );
  const openIdentities = openTabs.map(getLocalIdentity);
  const closedIdentities = closedTabs.map(getLocalIdentity);
  const defaultIdentity = getLocalIdentity(defaultTabState);
  const navigationIdentity = getNavigationDataViewIdentity(
    navigationDataViewSpec,
    savedDataViewIds
  );
  // Compatibility: translate previous IDs only from definitions visible during this load.
  const dataViewIdMap = createInlineDataViewIdMap([
    ...sessionIdentities,
    ...openIdentities,
    ...closedIdentities,
    defaultIdentity,
    navigationIdentity,
  ]);

  const openIdentitiesByTabId = new Map(
    openTabs.map((tab, index) => [tab.id, openIdentities[index]])
  );
  const conventionalTabs = new Map<string, ConventionalTab>();
  sessionTabs.forEach((tab, index) => {
    const identity = sessionIdentities[index];
    if (!identity || identity.dataView.id !== undefined) {
      return;
    }

    const viewIds = new Set([identity.id]);
    const localIdentity = openIdentitiesByTabId.get(tab.id);
    // Closed tabs keep no session, and tabs of another session may reuse the same tab IDs.
    if (openTabsFromSession && localIdentity) {
      viewIds.add(localIdentity.id);
    }

    conventionalTabs.set(tab.id, { documentId: identity.id, viewIds });
  });

  const getOpenTabConvention = (tabId: string) => {
    if (!openTabsFromSession) {
      return undefined;
    }

    return conventionalTabs.get(tabId);
  };

  const normalizedSessionTabs = sessionTabs.map((tab, index) => {
    const identity = sessionIdentities[index];
    const serializedSearchSource = normalizeInlineSearchSource({
      searchSource: tab.serializedSearchSource,
      identity,
      ownDataViewIdMap: withOwnInlineDataViewId(identity, dataViewIdMap),
      dataViewIdMap,
      bindUnreferencedFilters: identity?.dataView.id === undefined,
    });

    return serializedSearchSource === tab.serializedSearchSource
      ? tab
      : { ...tab, serializedSearchSource };
  });
  const normalizedOpenTabs = openTabs.map((tab, index) =>
    normalizeTabState({
      tab,
      identity: openIdentities[index],
      conventionalTab: getOpenTabConvention(tab.id),
      dataViewIdMap,
    })
  );
  const normalizedClosedTabs = closedTabs.map((tab, index) =>
    normalizeTabState({ tab, identity: closedIdentities[index], dataViewIdMap })
  );
  const sessionTabsChanged = normalizedSessionTabs.some((tab, index) => tab !== sessionTabs[index]);

  return {
    sessionTabs: sessionTabsChanged ? normalizedSessionTabs : sessionTabs,
    openTabs: normalizedOpenTabs,
    closedTabs: normalizedClosedTabs,
    defaultTabState: normalizeTabState({
      tab: defaultTabState,
      identity: defaultIdentity,
      dataViewIdMap,
    }),
    navigationDataViewSpec: normalizeNavigationDataViewSpec(
      navigationDataViewSpec,
      navigationIdentity
    ),
    navigationInlineId: navigationIdentity?.id,
    navigationIdMap: withOwnInlineDataViewId(navigationIdentity, dataViewIdMap),
    dataViewIdMap,
    conventionalTabs,
  };
};

// Discover prefers the navigation view, then the URL or restored data source, then the saved one.
const getUrlTargetViewId = ({
  navigationDataViewSpec,
  urlAppState,
  selectedTab,
  conventionalTab,
}: {
  navigationDataViewSpec: DataViewSpec | undefined;
  urlAppState: DiscoverAppState;
  selectedTab: TabState;
  conventionalTab: ConventionalTab;
}) => {
  if (navigationDataViewSpec) {
    return navigationDataViewSpec.id;
  }

  const dataSource = urlAppState.dataSource ?? selectedTab.appState.dataSource;

  return getAppStateViewId(dataSource, conventionalTab.documentId);
};

/**
 * Translates the URL app state and, when the selected tab follows the API convention, binds its
 * unreferenced app filters to the view the tab will use.
 */
export const normalizeUrlAppState = ({
  appState,
  selectedTab,
  normalized,
}: {
  appState: DiscoverAppState;
  selectedTab: TabState | undefined;
  normalized: NormalizedInlineDataViewIds;
}): DiscoverAppState => {
  const { dataViewIdMap, conventionalTabs, navigationDataViewSpec, navigationInlineId } =
    normalized;
  const translatedAppState = translateAppStateDataViewIds(appState, dataViewIdMap);
  if (!selectedTab) {
    return translatedAppState;
  }

  const conventionalTab = conventionalTabs.get(selectedTab.id);
  if (!conventionalTab) {
    return translatedAppState;
  }

  const targetId = getUrlTargetViewId({
    navigationDataViewSpec,
    urlAppState: translatedAppState,
    selectedTab,
    conventionalTab,
  });
  const viewIds = new Set(conventionalTab.viewIds);
  if (navigationInlineId) {
    viewIds.add(navigationInlineId);
  }

  return bindConventionalAppFilters(translatedAppState, targetId, viewIds);
};
