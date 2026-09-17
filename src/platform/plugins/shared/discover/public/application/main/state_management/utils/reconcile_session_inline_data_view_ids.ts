/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataViewSpec } from '@kbn/data-views-plugin/common';
import type { Filter } from '@kbn/es-query';
import type { DiscoverSession, DiscoverSessionTab } from '@kbn/saved-search-plugin/common';
import { createDataViewDataSource, isDataViewSource } from '../../../../../common/data_sources';
import {
  generateInlineDataViewId,
  getDataViewSpecKey,
  getInlineDataView,
} from '../../../../../common/session/inline_data_view';
import type { DiscoverAppState, TabState, TabStateGlobalState } from '../redux/types';

export interface InlineDataViewIdReplacement {
  fromId: string | undefined;
  toId: string;
  specKey: string;
}

interface DocumentDataViewTarget {
  dataView: DataViewSpec;
  id: string;
  specKey: string;
}

export interface ReconcileSessionInlineDataViewIdsResult {
  session: DiscoverSession;
  localTabs: TabState[];
  navigationDataViewSpec: DataViewSpec | undefined;
  selectedTabReplacement: InlineDataViewIdReplacement | undefined;
  replacedIds: string[];
}

export const replaceDataViewReferencesInFilters = (
  filters: Filter[] | undefined,
  replacement: InlineDataViewIdReplacement,
  bindUnreferenced: boolean
): Filter[] | undefined =>
  filters?.map((filter) => {
    const currentId = filter.meta.index;
    const shouldReplace =
      (replacement.fromId !== undefined && currentId === replacement.fromId) ||
      (bindUnreferenced && currentId === undefined);

    return shouldReplace
      ? { ...filter, meta: { ...filter.meta, index: replacement.toId } }
      : filter;
  });

export const replaceDataViewReferencesInAppState = (
  appState: DiscoverAppState | undefined,
  replacement: InlineDataViewIdReplacement | undefined
): DiscoverAppState | undefined => {
  if (!appState || !replacement) {
    return appState;
  }

  const shouldReplaceDataSource =
    replacement.fromId !== undefined &&
    isDataViewSource(appState.dataSource) &&
    appState.dataSource.dataViewId === replacement.fromId;

  const filters = replaceDataViewReferencesInFilters(appState.filters, replacement, false);

  return {
    ...appState,
    ...(shouldReplaceDataSource
      ? { dataSource: createDataViewDataSource({ dataViewId: replacement.toId }) }
      : undefined),
    ...(appState.filters !== undefined ? { filters } : undefined),
  };
};

export const replaceDataViewReferencesInGlobalState = (
  globalState: TabStateGlobalState | undefined,
  replacement: InlineDataViewIdReplacement | undefined
): TabStateGlobalState | undefined => {
  if (!globalState || !replacement) {
    return globalState;
  }

  const filters = replaceDataViewReferencesInFilters(globalState.filters, replacement, false);

  return {
    ...globalState,
    ...(globalState.filters !== undefined ? { filters } : undefined),
  };
};

const reconcileLocalTab = (tab: TabState, replacement: InlineDataViewIdReplacement): TabState => {
  const searchSource = tab.initialInternalState?.serializedSearchSource;
  const dataView = getInlineDataView(searchSource);

  if (!searchSource || !dataView || getDataViewSpecKey(dataView) !== replacement.specKey) {
    return tab;
  }

  const filters = replaceDataViewReferencesInFilters(searchSource.filter, replacement, true);

  return {
    ...tab,
    initialInternalState: {
      ...tab.initialInternalState,
      serializedSearchSource: {
        ...searchSource,
        index: { ...dataView, id: replacement.toId },
        ...(searchSource.filter !== undefined ? { filter: filters } : undefined),
      },
    },
    appState: replaceDataViewReferencesInAppState(tab.appState, replacement) ?? {},
    previousAppState: replaceDataViewReferencesInAppState(tab.previousAppState, replacement) ?? {},
    globalState: replaceDataViewReferencesInGlobalState(tab.globalState, replacement) ?? {},
  };
};

const reconcileSessionTab = (
  tab: DiscoverSessionTab,
  target: DocumentDataViewTarget,
  replacement: InlineDataViewIdReplacement | undefined
): DiscoverSessionTab => {
  const targetReplacement = { fromId: undefined, toId: target.id, specKey: target.specKey };
  const filters = replaceDataViewReferencesInFilters(
    replaceDataViewReferencesInFilters(
      tab.serializedSearchSource.filter,
      replacement ?? targetReplacement,
      false
    ),
    targetReplacement,
    true
  );
  return {
    ...tab,
    serializedSearchSource: {
      ...tab.serializedSearchSource,
      index: { ...target.dataView, id: target.id },
      ...(tab.serializedSearchSource.filter !== undefined ? { filter: filters } : undefined),
    },
  };
};

const getSelectedTabReplacement = ({
  navigationReplacement,
  navigationDataView,
  selectedTabId,
  localReplacementsByTab,
  selectedLocalTab,
  navigationTarget,
}: {
  navigationReplacement: InlineDataViewIdReplacement | undefined;
  navigationDataView: DataViewSpec | undefined;
  selectedTabId: string | undefined;
  localReplacementsByTab: Map<string, InlineDataViewIdReplacement>;
  selectedLocalTab: TabState | undefined;
  navigationTarget: DocumentDataViewTarget | undefined;
}): InlineDataViewIdReplacement | undefined => {
  if (navigationReplacement) {
    return navigationReplacement;
  }

  if (navigationDataView || !selectedTabId) {
    return undefined;
  }

  const localReplacement = localReplacementsByTab.get(selectedTabId);
  if (localReplacement) {
    return localReplacement;
  }

  if (selectedLocalTab || !navigationTarget) {
    return undefined;
  }

  return {
    fromId: undefined,
    toId: navigationTarget.id,
    specKey: navigationTarget.specKey,
  };
};

/**
 * Reconciles document, local and navigation identities before Discover consumes their state.
 * Persisted document IDs win; ID-less documents use the deterministic identity, while equivalent
 * local IDs are treated as aliases and only identity-bearing fields are updated.
 */
export const reconcileSessionInlineDataViewIds = ({
  session,
  localTabs,
  navigation,
}: {
  session: DiscoverSession;
  localTabs: TabState[];
  navigation?: { tabId: string | undefined; dataViewSpec: DataViewSpec | undefined };
}): ReconcileSessionInlineDataViewIdsResult => {
  const targetsByTab = new Map<string, DocumentDataViewTarget>();

  for (const tab of session.tabs) {
    const dataView = getInlineDataView(tab.serializedSearchSource);
    if (!dataView) {
      continue;
    }

    targetsByTab.set(tab.id, {
      dataView,
      id: dataView.id ?? generateInlineDataViewId(dataView),
      specKey: getDataViewSpecKey(dataView),
    });
  }

  const scopedReplacementsByTab = new Map<string, InlineDataViewIdReplacement>();
  const targetIdsByLocalAlias = new Map<string, Map<string, Set<string>>>();

  for (const tab of localTabs) {
    const target = targetsByTab.get(tab.id);
    const localDataView = getInlineDataView(tab.initialInternalState?.serializedSearchSource);
    if (!target || !localDataView || getDataViewSpecKey(localDataView) !== target.specKey) {
      continue;
    }

    const replacement: InlineDataViewIdReplacement = {
      fromId: localDataView.id,
      toId: target.id,
      specKey: target.specKey,
    };
    scopedReplacementsByTab.set(tab.id, replacement);

    if (replacement.fromId && replacement.fromId !== replacement.toId) {
      const targetIdsBySpec = targetIdsByLocalAlias.get(replacement.fromId) ?? new Map();
      const targetIds = targetIdsBySpec.get(replacement.specKey) ?? new Set<string>();
      targetIds.add(replacement.toId);
      targetIdsBySpec.set(replacement.specKey, targetIds);
      targetIdsByLocalAlias.set(replacement.fromId, targetIdsBySpec);
    }
  }

  // Duplicated or recently closed tabs are not part of the document, but can still carry the old
  // local ID of a persisted tab. Propagate that alias only when its definition resolves to one
  // document target; otherwise preserving the local ID is safer than guessing.
  const replacementsByLocalAlias = new Map<string, Map<string, InlineDataViewIdReplacement>>();
  for (const [fromId, targetIdsBySpec] of targetIdsByLocalAlias) {
    for (const [specKey, targetIds] of targetIdsBySpec) {
      if (targetIds.size !== 1) {
        continue;
      }

      const replacementsBySpec = replacementsByLocalAlias.get(fromId) ?? new Map();
      for (const toId of targetIds) {
        replacementsBySpec.set(specKey, { fromId, toId, specKey });
      }
      replacementsByLocalAlias.set(fromId, replacementsBySpec);
    }
  }

  const localReplacementsByTab = new Map<string, InlineDataViewIdReplacement>();
  const reconciledLocalTabs = localTabs.map((tab) => {
    const scopedReplacement = scopedReplacementsByTab.get(tab.id);
    if (scopedReplacement) {
      localReplacementsByTab.set(tab.id, scopedReplacement);
      return reconcileLocalTab(tab, scopedReplacement);
    }

    const dataView = getInlineDataView(tab.initialInternalState?.serializedSearchSource);
    if (!dataView?.id) {
      return tab;
    }

    const replacement = replacementsByLocalAlias
      .get(dataView.id)
      ?.get(getDataViewSpecKey(dataView));
    if (!replacement) {
      return tab;
    }

    localReplacementsByTab.set(tab.id, replacement);
    return reconcileLocalTab(tab, replacement);
  });

  const reconciledSession = {
    ...session,
    tabs: session.tabs.map((tab) => {
      const target = targetsByTab.get(tab.id);
      return target ? reconcileSessionTab(tab, target, scopedReplacementsByTab.get(tab.id)) : tab;
    }),
  };

  const selectedTabId = navigation?.tabId ?? session.tabs[0]?.id;
  const navigationTarget = selectedTabId ? targetsByTab.get(selectedTabId) : undefined;
  const selectedLocalTab = localTabs.find(({ id }) => id === selectedTabId);
  const navigationDataView = getInlineDataView({ index: navigation?.dataViewSpec });
  let navigationDataViewSpec = navigation?.dataViewSpec;
  let navigationReplacement: InlineDataViewIdReplacement | undefined;

  if (navigationDataView) {
    const navigationSpecKey = getDataViewSpecKey(navigationDataView);

    if (navigationTarget && navigationSpecKey === navigationTarget.specKey) {
      navigationReplacement = {
        fromId: navigationDataView.id,
        toId: navigationTarget.id,
        specKey: navigationTarget.specKey,
      };
    } else if (navigationDataView.id) {
      navigationReplacement = replacementsByLocalAlias
        .get(navigationDataView.id)
        ?.get(navigationSpecKey);
    }
  }

  if (navigationDataView && navigationReplacement) {
    navigationDataViewSpec = { ...navigationDataView, id: navigationReplacement.toId };
  }

  const selectedTabReplacement = getSelectedTabReplacement({
    navigationReplacement,
    navigationDataView,
    selectedTabId,
    localReplacementsByTab,
    selectedLocalTab,
    navigationTarget,
  });
  const replacedIds = new Set<string>();
  for (const replacement of localReplacementsByTab.values()) {
    if (replacement.fromId && replacement.fromId !== replacement.toId) {
      replacedIds.add(replacement.fromId);
    }
  }
  if (
    navigationReplacement?.fromId &&
    navigationReplacement.fromId !== navigationReplacement.toId
  ) {
    replacedIds.add(navigationReplacement.fromId);
  }

  return {
    session: reconciledSession,
    localTabs: reconciledLocalTabs,
    navigationDataViewSpec,
    selectedTabReplacement,
    replacedIds: [...replacedIds],
  };
};
