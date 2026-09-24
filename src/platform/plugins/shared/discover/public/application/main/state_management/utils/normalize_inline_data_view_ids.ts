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
import type { DiscoverDataSource } from '../../../../../common/data_sources';
import { createDataViewDataSource, isDataViewSource } from '../../../../../common/data_sources';
import {
  bindUnreferencedAppFilters,
  createInlineDataViewIdMap,
  getInlineDataViewIdentity,
  normalizeInlineSearchSource,
  translateFilterDataViewIds,
  withOwnInlineDataViewId,
  type DataViewIdMap,
  type InlineDataViewIdentity,
} from '../../../../../common/session/inline_data_view_references';
import type { DiscoverAppState, TabState, TabStateGlobalState } from '../redux/types';

/** A tab whose document spec has no ID, with the views its unreferenced app filters may target. */
export interface ConventionalTab {
  documentId: string;
  viewIds: ReadonlySet<string>;
}

export interface NormalizedInlineDataViewIds {
  sessionTabs: DiscoverSessionTab[];
  localTabs: TabState[];
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
  const dataViewId = isDataViewSource(dataSource) ? idMap.get(dataSource.dataViewId) : undefined;
  const translatedFilters = filters && translateFilterDataViewIds(filters, idMap);

  if (dataViewId === undefined && translatedFilters === filters) {
    return appState;
  }

  return {
    ...appState,
    ...(dataViewId !== undefined && { dataSource: createDataViewDataSource({ dataViewId }) }),
    ...(translatedFilters !== filters && { filters: translatedFilters }),
  };
};

const translateGlobalStateDataViewIds = (
  globalState: TabStateGlobalState,
  idMap: DataViewIdMap
): TabStateGlobalState => {
  const { filters } = globalState;
  const translatedFilters = filters && translateFilterDataViewIds(filters, idMap);

  return translatedFilters === filters
    ? globalState
    : { ...globalState, filters: translatedFilters };
};

// Without a data source, Discover uses the view of the saved tab.
const getAppStateViewId = (dataSource: DiscoverDataSource | undefined, documentId: string) => {
  if (dataSource === undefined) {
    return documentId;
  }

  return isDataViewSource(dataSource) ? dataSource.dataViewId : undefined;
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

const normalizeLocalTab = ({
  tab,
  identity,
  conventionalTab,
  dataViewIdMap,
}: {
  tab: TabState;
  identity: InlineDataViewIdentity | undefined;
  conventionalTab: ConventionalTab | undefined;
  dataViewIdMap: DataViewIdMap;
}): TabState => {
  const idMap = withOwnInlineDataViewId(identity, dataViewIdMap);
  const { initialInternalState, appState, previousAppState, globalState } = tab;
  // The convention applies when the local spec or the document spec of the same tab has no ID.
  const followsConvention = Boolean(identity && (!identity.dataView.id || conventionalTab));
  const searchSource = initialInternalState?.serializedSearchSource;
  const normalizedSearchSource =
    searchSource &&
    normalizeInlineSearchSource({
      searchSource,
      identity,
      idMap,
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
  const normalizedGlobalState = translateGlobalStateDataViewIds(globalState, idMap);

  if (
    normalizedSearchSource === searchSource &&
    normalizedAppState === appState &&
    normalizedPreviousAppState === previousAppState &&
    normalizedGlobalState === globalState
  ) {
    return tab;
  }

  return {
    ...tab,
    ...(initialInternalState &&
      normalizedSearchSource !== searchSource && {
        initialInternalState: {
          ...initialInternalState,
          serializedSearchSource: normalizedSearchSource,
        },
      }),
    appState: normalizedAppState,
    previousAppState: normalizedPreviousAppState,
    globalState: normalizedGlobalState,
  };
};

/**
 * Gives every inline view the ID derived from its own spec before Discover consumes any state,
 * translating only references whose previous ID maps to a single spec.
 */
export const normalizeInlineDataViewIds = ({
  sessionTabs,
  localTabs,
  navigationDataViewSpec,
}: {
  sessionTabs: DiscoverSessionTab[];
  localTabs: TabState[];
  navigationDataViewSpec: DataViewSpec | undefined;
}): NormalizedInlineDataViewIds => {
  const sessionIdentities = sessionTabs.map((tab) =>
    getInlineDataViewIdentity(tab.serializedSearchSource)
  );
  const localIdentities = localTabs.map((tab) =>
    getInlineDataViewIdentity(tab.initialInternalState?.serializedSearchSource)
  );
  const navigationIdentity = getInlineDataViewIdentity({ index: navigationDataViewSpec });
  const dataViewIdMap = createInlineDataViewIdMap([
    ...sessionIdentities,
    ...localIdentities,
    navigationIdentity,
  ]);

  const localIdentitiesByTabId = new Map(
    localTabs.map((tab, index) => [tab.id, localIdentities[index]])
  );
  const conventionalTabs = new Map<string, ConventionalTab>();
  sessionTabs.forEach((tab, index) => {
    const identity = sessionIdentities[index];
    if (!identity || identity.dataView.id !== undefined) {
      return;
    }

    const localIdentity = localIdentitiesByTabId.get(tab.id);
    conventionalTabs.set(tab.id, {
      documentId: identity.id,
      viewIds: new Set(localIdentity ? [identity.id, localIdentity.id] : [identity.id]),
    });
  });

  const normalizedSessionTabs = sessionTabs.map((tab, index) => {
    const identity = sessionIdentities[index];
    const serializedSearchSource = normalizeInlineSearchSource({
      searchSource: tab.serializedSearchSource,
      identity,
      idMap: withOwnInlineDataViewId(identity, dataViewIdMap),
      bindUnreferencedFilters: identity?.dataView.id === undefined,
    });

    return serializedSearchSource === tab.serializedSearchSource
      ? tab
      : { ...tab, serializedSearchSource };
  });
  const normalizedLocalTabs = localTabs.map((tab, index) =>
    normalizeLocalTab({
      tab,
      identity: localIdentities[index],
      conventionalTab: conventionalTabs.get(tab.id),
      dataViewIdMap,
    })
  );

  return {
    sessionTabs: normalizedSessionTabs.every((tab, index) => tab === sessionTabs[index])
      ? sessionTabs
      : normalizedSessionTabs,
    localTabs: normalizedLocalTabs,
    navigationDataViewSpec: navigationIdentity
      ? { ...navigationIdentity.dataView, id: navigationIdentity.id }
      : navigationDataViewSpec,
    navigationInlineId: navigationIdentity?.id,
    navigationIdMap: withOwnInlineDataViewId(navigationIdentity, dataViewIdMap),
    dataViewIdMap,
    conventionalTabs,
  };
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
  const conventionalTab = selectedTab ? conventionalTabs.get(selectedTab.id) : undefined;
  if (!selectedTab || !conventionalTab) {
    return translatedAppState;
  }

  // Discover prefers the navigation view, then the URL or restored data source, then the saved one.
  const targetId = navigationDataViewSpec
    ? navigationDataViewSpec.id
    : getAppStateViewId(
        translatedAppState.dataSource ?? selectedTab.appState.dataSource,
        conventionalTab.documentId
      );
  const viewIds = navigationInlineId
    ? new Set([...conventionalTab.viewIds, navigationInlineId])
    : conventionalTab.viewIds;

  return bindConventionalAppFilters(translatedAppState, targetId, viewIds);
};
