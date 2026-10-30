/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SerializedSearchSourceFields } from '@kbn/data-plugin/common';
import type { DataViewSpec } from '@kbn/data-views-plugin/common';
import type { DiscoverSessionTab } from '@kbn/saved-search-plugin/common';
import type { InlineDataViewIdentity } from '../../../../../common/session/inline_data_view';
import type { InlineDataViewIdCompatibility } from '../../../../../common/session/inline_data_view_id_compatibility';
import {
  getInlineDataViewIdentity,
  normalizeInlineAppState,
  normalizeInlineSearchSource,
  remapDataViewReferences,
  remapVisContextDataViewId,
} from '../../../../../common/session/inline_data_view_references';
import type { InitialTabState } from '../../../../plugin_imports/initial_tab_state_service';
import type { DiscoverAppState, TabState } from '../redux/types';
import type {
  RecentlyClosedTabStateInLocalStorage,
  TabStateInLocalStorage,
} from '../tabs_storage_manager';
import {
  createInlineDataViewLoadCompatibility,
  type ConventionalTab,
  type InlineDataViewLoadCompatibility,
  type PreparedInlineDataViewLoadState,
} from './inline_data_view_load_compatibility';

export interface NormalizedInlineDataViewIds {
  sessionTabs: DiscoverSessionTab[];
  openTabs: TabStateInLocalStorage[];
  closedTabs: RecentlyClosedTabStateInLocalStorage[];
  defaultTab: DiscoverSessionTab | undefined;
  navigationDataViewSpec: DataViewSpec | undefined;
  /** Owns all ID maps, navigation and URL compatibility for this load. */
  loadCompatibility: InlineDataViewLoadCompatibility;
}

// The chart was saved for the tab's own view, so its previous ID follows the view's mapping.
const normalizeVisContext = <T extends Pick<DiscoverSessionTab, 'visContext'>>(
  container: T,
  identity: InlineDataViewIdentity | undefined,
  { forView }: InlineDataViewIdCompatibility
): T => {
  if (!container.visContext) {
    return container;
  }

  const visContext = remapVisContextDataViewId(container.visContext, forView(identity));

  return visContext === container.visContext ? container : { ...container, visContext };
};

const normalizeStoredTab = <T extends TabStateInLocalStorage>({
  tab,
  identity,
  documentSearchSource,
  idCompatibility,
}: {
  tab: T;
  identity: InlineDataViewIdentity | undefined;
  documentSearchSource?: SerializedSearchSourceFields;
  idCompatibility: InlineDataViewIdCompatibility;
}): T => {
  const { internalState, attributes, appState, globalState } = tab;
  const searchSource = internalState?.serializedSearchSource;

  let normalizedInternalState = internalState;
  if (internalState && searchSource) {
    const serializedSearchSource = normalizeInlineSearchSource(searchSource, {
      idCompatibility,
      documentSearchSource,
    });
    if (serializedSearchSource !== searchSource) {
      normalizedInternalState = { ...internalState, serializedSearchSource };
    }
  }

  const normalizedAttributes =
    attributes && normalizeVisContext(attributes, identity, idCompatibility);
  let normalizedAppState = appState;
  if (appState) {
    normalizedAppState = normalizeInlineAppState(appState, {
      searchSource,
      documentSearchSource,
      idCompatibility,
    });
  }

  let normalizedGlobalState = globalState;
  if (globalState) {
    normalizedGlobalState = remapDataViewReferences(globalState, idCompatibility.shared);
  }

  if (
    normalizedInternalState === internalState &&
    normalizedAttributes === attributes &&
    normalizedAppState === appState &&
    normalizedGlobalState === globalState
  ) {
    return tab;
  }

  return {
    ...tab,
    internalState: normalizedInternalState,
    attributes: normalizedAttributes,
    appState: normalizedAppState,
    globalState: normalizedGlobalState,
  };
};

const normalizeDocumentTab = (
  tab: DiscoverSessionTab,
  identity: InlineDataViewIdentity | undefined,
  idCompatibility: InlineDataViewIdCompatibility
) => {
  const serializedSearchSource = normalizeInlineSearchSource(tab.serializedSearchSource, {
    idCompatibility,
  });
  const normalizedTab = normalizeVisContext(tab, identity, idCompatibility);

  return serializedSearchSource === tab.serializedSearchSource
    ? normalizedTab
    : { ...normalizedTab, serializedSearchSource };
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
  /** Undefined when the saved list is unavailable. */
  savedDataViewIds: readonly string[] | undefined;
}): NormalizedInlineDataViewIds => {
  const getLocalIdentity = (tab: TabStateInLocalStorage) =>
    getInlineDataViewIdentity(tab.internalState?.serializedSearchSource);
  const sessionIdentities = sessionTabs.map((tab) =>
    getInlineDataViewIdentity(tab.serializedSearchSource)
  );
  const openIdentities = openTabs.map(getLocalIdentity);
  const closedIdentities = closedTabs.map(getLocalIdentity);
  const defaultIdentity = getInlineDataViewIdentity(defaultTab?.serializedSearchSource);

  const conventionalTabs = new Map<string, ConventionalTab>();
  sessionTabs.forEach((tab, index) => {
    const identity = sessionIdentities[index];
    if (identity && identity.dataView.id === undefined) {
      conventionalTabs.set(tab.id, {
        documentId: identity.id,
        viewIds: new Set([identity.id]),
      });
    }
  });

  const openDocuments = openTabs.map(({ id }) =>
    openTabsFromSession ? sessionTabs.find((sessionTab) => sessionTab.id === id) : undefined
  );
  openTabs.forEach((_, index) => {
    const document = openDocuments[index];
    const localIdentity = openIdentities[index];
    if (document && localIdentity) {
      const conventionalTab = conventionalTabs.get(document.id);
      if (conventionalTab) {
        conventionalTabs.set(document.id, {
          ...conventionalTab,
          viewIds: new Set([...conventionalTab.viewIds, localIdentity.id]),
        });
      }
    }
  });

  // Local tabs replace their document only when they are restored for the same session.
  const tabViews = new Map<string, InlineDataViewIdentity | undefined>();
  sessionTabs.forEach(({ id }, index) => tabViews.set(id, sessionIdentities[index]));
  openTabs.forEach(({ id }, index) => {
    if (openTabsFromSession || !tabViews.has(id)) {
      tabViews.set(id, openIdentities[index]);
    }
  });

  const loadCompatibility = createInlineDataViewLoadCompatibility({
    views: [
      ...sessionIdentities,
      ...openIdentities,
      ...closedIdentities,
      defaultIdentity,
    ],
    tabViews,
    conventionalTabs,
    savedDataViewIds,
    navigationDataViewSpec,
  });
  const { ids: idCompatibility } = loadCompatibility;

  const normalizedOpenTabs = openTabs.map((tab, index) =>
    normalizeStoredTab({
      tab,
      identity: openIdentities[index],
      documentSearchSource: openDocuments[index]?.serializedSearchSource,
      idCompatibility,
    })
  );
  const normalizedSessionTabs = sessionTabs.map((tab, index) =>
    normalizeDocumentTab(tab, sessionIdentities[index], idCompatibility)
  );
  const normalizedClosedTabs = closedTabs.map((tab, index) =>
    normalizeStoredTab({ tab, identity: closedIdentities[index], idCompatibility })
  );
  const sessionTabsChanged = normalizedSessionTabs.some((tab, index) => tab !== sessionTabs[index]);

  let normalizedDefaultTab = defaultTab;
  if (defaultTab) {
    normalizedDefaultTab = normalizeDocumentTab(defaultTab, defaultIdentity, idCompatibility);
  }

  return {
    sessionTabs: sessionTabsChanged ? normalizedSessionTabs : sessionTabs,
    openTabs: normalizedOpenTabs,
    closedTabs: normalizedClosedTabs,
    defaultTab: normalizedDefaultTab,
    navigationDataViewSpec: loadCompatibility.navigationDataViewSpec,
    loadCompatibility,
  };
};

/** Translates and binds app state through the compatibility facade for this load. */
export const normalizeUrlAppState = ({
  appState,
  selectedTab,
  normalized,
}: {
  appState: DiscoverAppState;
  selectedTab: TabState | undefined;
  normalized: NormalizedInlineDataViewIds;
}): DiscoverAppState =>
  normalized.loadCompatibility.prepare({
    selectedTab,
    urlAppState: appState,
    urlGlobalState: undefined,
    initialTabState: undefined,
  }).urlAppState ?? appState;

/** Prepares URL, navigation and runtime updates through one load compatibility facade. */
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
  urlGlobalState: Parameters<InlineDataViewLoadCompatibility['prepare']>[0]['urlGlobalState'];
  initialTabState: InitialTabState | undefined;
}): PreparedInlineDataViewLoadState =>
  normalized.loadCompatibility.prepare({
    selectedTab,
    urlAppState,
    urlGlobalState,
    initialTabState,
  });
