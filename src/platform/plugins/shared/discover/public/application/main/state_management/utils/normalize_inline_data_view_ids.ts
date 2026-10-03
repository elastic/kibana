/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SerializedSearchSourceFields } from '@kbn/data-plugin/common';
import type { GlobalQueryStateFromUrl } from '@kbn/data-plugin/public';
import type { DataViewSpec } from '@kbn/data-views-plugin/common';
import type { DiscoverSessionTab } from '@kbn/saved-search-plugin/common';
import { isDataViewSource } from '../../../../../common/data_sources';
import {
  getInitialDataViewId,
  getNavigationDataView,
  getRequestedDataView,
} from '../../../../../common/session/initial_data_view';
import {
  bindUnreferencedAppFilters,
  getInlineDataViewIdentity,
  normalizeInlineAppState,
  normalizeInlineSearchSource,
  remapDataViewReferences,
  type InlineDataViewReferenceContext,
} from '../../../../../common/session/inline_data_view_references';
import {
  createInlineDataViewIdMap,
  withOwnInlineDataViewId,
  type DataViewIdMap,
} from '../../../../../common/session/inline_data_view_id_compatibility';
import type { InlineDataViewIdentity } from '../../../../../common/session/inline_data_view';
import type { DiscoverAppState, TabState } from '../redux/types';
import type {
  RecentlyClosedTabStateInLocalStorage,
  TabStateInLocalStorage,
} from '../tabs_storage_manager';
import type { InitialTabState } from '../../../../plugin_imports/initial_tab_state_service';

/** A tab whose document spec has no ID, with the views its unreferenced app filters may target. */
export interface ConventionalTab {
  documentId: string;
  viewIds: ReadonlySet<string>;
}

export interface NormalizedInlineDataViewIds {
  sessionTabs: DiscoverSessionTab[];
  openTabs: TabStateInLocalStorage[];
  closedTabs: RecentlyClosedTabStateInLocalStorage[];
  defaultTab: DiscoverSessionTab | undefined;
  navigationDataViewSpec: DataViewSpec | undefined;
  /** Known saved navigation views are references; other views retain their definitions. */
  navigationDataView: DataViewSpec | string | undefined;
  /** Translates references owned by the navigation, such as its default app state. */
  navigationIdMap: DataViewIdMap;
  /** Translates spec-less references, such as URL state; ambiguous IDs are left out. */
  dataViewIdMap: DataViewIdMap;
  /** Tabs following the API convention, where filters without a reference target the tab view. */
  conventionalTabs: ReadonlyMap<string, ConventionalTab>;
}

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

const normalizeStoredInternalState = (
  internalState: TabStateInLocalStorage['internalState'],
  references: InlineDataViewReferenceContext
) => {
  const searchSource = internalState?.serializedSearchSource;
  if (!internalState || !searchSource) {
    return internalState;
  }

  const serializedSearchSource = normalizeInlineSearchSource(searchSource, references);

  if (serializedSearchSource === searchSource) {
    return internalState;
  }

  return { ...internalState, serializedSearchSource };
};

const normalizeStoredTab = <T extends TabStateInLocalStorage>({
  tab,
  documentSearchSource,
  dataViewIdMap,
}: {
  tab: T;
  documentSearchSource?: SerializedSearchSourceFields;
  dataViewIdMap: DataViewIdMap;
}): T => {
  const { internalState, appState, globalState } = tab;
  const references = {
    documentSearchSource,
    sharedIdMap: dataViewIdMap,
  };
  const normalizedInternalState = normalizeStoredInternalState(internalState, references);
  let normalizedAppState = appState;
  if (appState) {
    normalizedAppState = normalizeInlineAppState(appState, {
      ...references,
      searchSource: internalState?.serializedSearchSource,
    });
  }

  let normalizedGlobalState = globalState;
  if (globalState) {
    normalizedGlobalState = remapDataViewReferences(globalState, dataViewIdMap);
  }

  if (
    normalizedInternalState === internalState &&
    normalizedAppState === appState &&
    normalizedGlobalState === globalState
  ) {
    return tab;
  }

  return {
    ...tab,
    internalState: normalizedInternalState,
    appState: normalizedAppState,
    globalState: normalizedGlobalState,
  };
};

const normalizeDocumentTab = (tab: DiscoverSessionTab, dataViewIdMap: DataViewIdMap) => {
  const serializedSearchSource = normalizeInlineSearchSource(tab.serializedSearchSource, {
    sharedIdMap: dataViewIdMap,
  });

  return serializedSearchSource === tab.serializedSearchSource
    ? tab
    : { ...tab, serializedSearchSource };
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
  defaultTab,
  openTabsFromSession,
  navigationDataViewSpec,
  savedDataViewIds,
}: {
  sessionTabs: DiscoverSessionTab[];
  openTabs: TabStateInLocalStorage[];
  closedTabs: RecentlyClosedTabStateInLocalStorage[];
  /** The fallback tab can contain a by-value panel, including its legacy references. */
  defaultTab?: DiscoverSessionTab;
  /** Whether the open tabs were stored for the session, the only tabs its convention applies to. */
  openTabsFromSession: boolean;
  navigationDataViewSpec: DataViewSpec | undefined;
  /** Saved views already known to the loader, including navigation specs without a version. */
  savedDataViewIds: readonly string[];
}): NormalizedInlineDataViewIds => {
  const getLocalIdentity = (tab: TabStateInLocalStorage) =>
    getInlineDataViewIdentity(tab.internalState?.serializedSearchSource);
  const sessionIdentities = sessionTabs.map((tab) =>
    getInlineDataViewIdentity(tab.serializedSearchSource)
  );
  const openIdentities = openTabs.map(getLocalIdentity);
  const closedIdentities = closedTabs.map(getLocalIdentity);
  const defaultIdentity = getInlineDataViewIdentity(defaultTab?.serializedSearchSource);
  const navigationIdentity = getInlineDataViewIdentity({
    index: getNavigationDataView(navigationDataViewSpec, savedDataViewIds),
  });
  // Compatibility: translate previous IDs only from definitions visible during this load.
  const dataViewIdMap = createInlineDataViewIdMap([
    ...sessionIdentities,
    ...openIdentities,
    ...closedIdentities,
    defaultIdentity,
    navigationIdentity,
  ]);

  const conventionalTabs = new Map<string, { documentId: string; viewIds: Set<string> }>();
  sessionTabs.forEach((tab, index) => {
    const identity = sessionIdentities[index];
    if (!identity || identity.dataView.id !== undefined) {
      return;
    }

    conventionalTabs.set(tab.id, { documentId: identity.id, viewIds: new Set([identity.id]) });
  });

  const normalizedOpenTabs: TabStateInLocalStorage[] = [];
  for (const [index, tab] of openTabs.entries()) {
    // One association governs both local binding and the views allowed by the URL convention.
    const document = openTabsFromSession
      ? sessionTabs.find((sessionTab) => sessionTab.id === tab.id)
      : undefined;
    const localIdentity = openIdentities[index];

    if (document && localIdentity) {
      conventionalTabs.get(document.id)?.viewIds.add(localIdentity.id);
    }

    normalizedOpenTabs.push(
      normalizeStoredTab({
        tab,
        documentSearchSource: document?.serializedSearchSource,
        dataViewIdMap,
      })
    );
  }

  const normalizedSessionTabs = sessionTabs.map((tab) => normalizeDocumentTab(tab, dataViewIdMap));
  const normalizedClosedTabs = closedTabs.map((tab) => normalizeStoredTab({ tab, dataViewIdMap }));
  const sessionTabsChanged = normalizedSessionTabs.some((tab, index) => tab !== sessionTabs[index]);
  const normalizedNavigationSpec = normalizeNavigationDataViewSpec(
    navigationDataViewSpec,
    navigationIdentity
  );

  let normalizedDefaultTab = defaultTab;
  if (defaultTab) {
    normalizedDefaultTab = normalizeDocumentTab(defaultTab, dataViewIdMap);
  }

  return {
    sessionTabs: sessionTabsChanged ? normalizedSessionTabs : sessionTabs,
    openTabs: normalizedOpenTabs,
    closedTabs: normalizedClosedTabs,
    defaultTab: normalizedDefaultTab,
    navigationDataViewSpec: normalizedNavigationSpec,
    navigationDataView: getNavigationDataView(normalizedNavigationSpec, savedDataViewIds),
    navigationIdMap: withOwnInlineDataViewId(navigationIdentity, dataViewIdMap),
    dataViewIdMap,
    conventionalTabs,
  };
};

const getUrlTargetViewId = ({
  navigationDataView,
  urlAppState,
  selectedTab,
  conventionalTab,
}: {
  navigationDataView: DataViewSpec | string | undefined;
  urlAppState: DiscoverAppState;
  selectedTab: TabState;
  conventionalTab: ConventionalTab;
}) => {
  const dataSource = urlAppState.dataSource ?? selectedTab.appState.dataSource;
  const usesEsqlSource = dataSource !== undefined && !isDataViewSource(dataSource);

  if (navigationDataView === undefined && usesEsqlSource) {
    return undefined;
  }

  const restoredIndex = selectedTab.initialInternalState?.serializedSearchSource?.index;
  const dataViewId = getInitialDataViewId({
    dataSource,
    documentDataViewId: conventionalTab.documentId,
  });
  const requested = getRequestedDataView({
    dataViewId,
    navigationDataView,
    restoredDataViewSpec: typeof restoredIndex === 'object' ? restoredIndex : undefined,
  });

  return typeof requested === 'string' ? requested : requested?.id;
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
  const { dataViewIdMap, conventionalTabs, navigationDataView } = normalized;
  const translatedAppState = remapDataViewReferences(appState, dataViewIdMap);
  if (!selectedTab) {
    return translatedAppState;
  }

  const conventionalTab = conventionalTabs.get(selectedTab.id);
  if (!conventionalTab) {
    return translatedAppState;
  }

  const targetId = getUrlTargetViewId({
    navigationDataView,
    urlAppState: translatedAppState,
    selectedTab,
    conventionalTab,
  });
  const viewIds = new Set(conventionalTab.viewIds);
  const navigationInlineId = getInlineDataViewIdentity({ index: navigationDataView })?.id;
  if (navigationInlineId) {
    viewIds.add(navigationInlineId);
  }

  return bindConventionalAppFilters(translatedAppState, targetId, viewIds);
};

export interface PreparedInlineDataViewLoadState {
  urlAppState: DiscoverAppState | undefined;
  urlGlobalState: GlobalQueryStateFromUrl | undefined;
  initialTabState: InitialTabState | undefined;
  /** Old IDs to remove from Discover's runtime list, not from the Data Views instance cache. */
  dataViewIdsToRemove: readonly string[];
}

const prepareInitialTabState = (
  initialTabState: InitialTabState | undefined,
  { navigationDataViewSpec, navigationIdMap }: NormalizedInlineDataViewIds
) => {
  if (!initialTabState) {
    return initialTabState;
  }

  const preparedTabState = { ...initialTabState, dataViewSpec: navigationDataViewSpec };
  const { defaultState } = initialTabState;

  if (defaultState) {
    preparedTabState.defaultState = remapDataViewReferences(defaultState, navigationIdMap);
  }

  return preparedTabState;
};

/** Prepares URL, navigation and runtime updates without exposing identity maps to their consumers. */
export const prepareInlineDataViewLoadState = ({
  normalized,
  selectedTab,
  urlAppState,
  urlGlobalState,
  initialTabState,
}: {
  normalized: NormalizedInlineDataViewIds;
  selectedTab: TabState | undefined;
  /** URL state after the existing legacy-key migration. */
  urlAppState: DiscoverAppState | undefined;
  urlGlobalState: GlobalQueryStateFromUrl | undefined;
  initialTabState: InitialTabState | undefined;
}): PreparedInlineDataViewLoadState => {
  const { dataViewIdMap } = normalized;

  let preparedUrlAppState = urlAppState;
  if (urlAppState) {
    preparedUrlAppState = normalizeUrlAppState({ appState: urlAppState, selectedTab, normalized });
  }

  let preparedUrlGlobalState = urlGlobalState;
  if (urlGlobalState) {
    preparedUrlGlobalState = remapDataViewReferences(urlGlobalState, dataViewIdMap);
  }

  return {
    urlAppState: preparedUrlAppState,
    urlGlobalState: preparedUrlGlobalState,
    initialTabState: prepareInitialTabState(initialTabState, normalized),
    dataViewIdsToRemove: [...dataViewIdMap.keys()],
  };
};
