/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { GlobalQueryStateFromUrl } from '@kbn/data-plugin/public';
import type { DataViewSpec } from '@kbn/data-views-plugin/common';
import {
  createInlineDataViewIdCompatibility,
  type DataViewIdMap,
  type InlineDataViewIdCompatibility,
} from '../../../../../common/session/inline_data_view_id_compatibility';
import type { InlineDataViewIdentity } from '../../../../../common/session/inline_data_view';
import {
  bindUnreferencedAppFilters,
  getInlineDataViewIdentity,
  remapDataViewReferences,
} from '../../../../../common/session/inline_data_view_references';
import {
  getInitialDataViewId,
  getNavigationDataView,
  getRequestedDataView,
} from '../../../../../common/session/initial_data_view';
import { isDataViewSource } from '../../../../../common/data_sources';
import type { InitialTabState } from '../../../../plugin_imports/initial_tab_state_service';
import type { DiscoverAppState, TabState } from '../redux/types';

/** An ID-less document tab and the views its unreferenced app filters may target. */
export interface ConventionalTab {
  documentId: string;
  viewIds: ReadonlySet<string>;
}

export interface PreparedInlineDataViewLoadState {
  urlAppState: DiscoverAppState | undefined;
  urlGlobalState: GlobalQueryStateFromUrl | undefined;
  initialTabState: InitialTabState | undefined;
  /** Old IDs to remove from Discover's runtime list, not from the Data Views instance cache. */
  dataViewIdsToRemove: readonly string[];
}

export interface InlineDataViewLoadCompatibility {
  ids: InlineDataViewIdCompatibility;
  navigationDataViewSpec: DataViewSpec | undefined;
  navigationDataView: DataViewSpec | string | undefined;
  prepare: (options: {
    selectedTab: TabState | undefined;
    urlAppState: DiscoverAppState | undefined;
    urlGlobalState: GlobalQueryStateFromUrl | undefined;
    initialTabState: InitialTabState | undefined;
  }) => PreparedInlineDataViewLoadState;
}

const withEntry = (idMap: DataViewIdMap, previousId: string, id: string): DataViewIdMap =>
  new Map([...idMap, [previousId, id]]);

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

/** Creates the compatibility facade used throughout one Discover load. */
export const createInlineDataViewLoadCompatibility = ({
  views,
  tabViews,
  conventionalTabs,
  savedDataViewIds,
  navigationDataViewSpec,
}: {
  views: ReadonlyArray<InlineDataViewIdentity | undefined>;
  tabViews: ReadonlyMap<string, InlineDataViewIdentity | undefined>;
  conventionalTabs: ReadonlyMap<string, ConventionalTab>;
  /** Undefined when the saved list is unavailable, so no URL ID can be presumed previous. */
  savedDataViewIds: readonly string[] | undefined;
  navigationDataViewSpec: DataViewSpec | undefined;
}): InlineDataViewLoadCompatibility => {
  const savedIds = savedDataViewIds ?? [];
  const navigationDataView = getNavigationDataView(navigationDataViewSpec, savedIds);
  const navigationIdentity = getInlineDataViewIdentity({ index: navigationDataView });
  const normalizedNavigationSpec = navigationIdentity
    ? { ...navigationIdentity.dataView, id: navigationIdentity.id }
    : navigationDataViewSpec;
  const ids = createInlineDataViewIdCompatibility({
    views: [...views, navigationIdentity],
  });
  const knownIds =
    savedDataViewIds &&
    new Set([
      ...savedDataViewIds,
      ...ids.shared.keys(),
      ...views.flatMap((identity) => (identity ? [identity.id] : [])),
      ...(navigationIdentity ? [navigationIdentity.id] : []),
    ]);

  const getUrlMaps = (
    selectedTab: TabState | undefined,
    urlAppState: DiscoverAppState | undefined
  ): { app: DataViewIdMap; global: DataViewIdMap; presumedPreviousId?: string } => {
    if (!selectedTab || navigationDataView !== undefined) {
      return { app: ids.shared, global: ids.shared };
    }

    const tabIdMap = ids.forView(tabViews.get(selectedTab.id));
    const conventionalTab = conventionalTabs.get(selectedTab.id);
    const dataSource = urlAppState?.dataSource;
    if (!conventionalTab || !knownIds || !isDataViewSource(dataSource)) {
      return { app: tabIdMap, global: ids.shared };
    }

    const restoredId = tabViews.get(selectedTab.id)?.id;
    const { dataViewId } = dataSource;
    if (
      (restoredId !== undefined && restoredId !== conventionalTab.documentId) ||
      tabIdMap.has(dataViewId) ||
      knownIds.has(dataViewId)
    ) {
      return { app: tabIdMap, global: ids.shared };
    }

    return {
      app: withEntry(tabIdMap, dataViewId, conventionalTab.documentId),
      global: withEntry(ids.shared, dataViewId, conventionalTab.documentId),
      presumedPreviousId: dataViewId,
    };
  };

  const prepare: InlineDataViewLoadCompatibility['prepare'] = ({
    selectedTab,
    urlAppState,
    urlGlobalState,
    initialTabState,
  }) => {
    const urlMaps = getUrlMaps(selectedTab, urlAppState);
    let preparedUrlAppState = urlAppState;
    if (urlAppState) {
      preparedUrlAppState = remapDataViewReferences(urlAppState, urlMaps.app);
      if (selectedTab) {
        const conventionalTab = conventionalTabs.get(selectedTab.id);
        if (conventionalTab) {
          const targetId = getUrlTargetViewId({
            navigationDataView,
            urlAppState: preparedUrlAppState,
            selectedTab,
            conventionalTab,
          });
          const viewIds = new Set(conventionalTab.viewIds);
          if (navigationIdentity) {
            viewIds.add(navigationIdentity.id);
          }
          preparedUrlAppState = bindConventionalAppFilters(
            preparedUrlAppState,
            targetId,
            viewIds
          );
        }
      }
    }

    const preparedUrlGlobalState = urlGlobalState
      ? remapDataViewReferences(urlGlobalState, urlMaps.global)
      : urlGlobalState;
    const preparedInitialTabState = initialTabState
      ? {
          ...initialTabState,
          dataViewSpec: normalizedNavigationSpec,
          ...(initialTabState.defaultState && {
            defaultState: remapDataViewReferences(
              initialTabState.defaultState,
              ids.forView(navigationIdentity)
            ),
          }),
        }
      : initialTabState;

    return {
      urlAppState: preparedUrlAppState,
      urlGlobalState: preparedUrlGlobalState,
      initialTabState: preparedInitialTabState,
      dataViewIdsToRemove: [
        ...new Set([
          ...ids.shared.keys(),
          ...(urlMaps.presumedPreviousId ? [urlMaps.presumedPreviousId] : []),
        ]),
      ],
    };
  };

  return {
    ids,
    navigationDataViewSpec: normalizedNavigationSpec,
    navigationDataView: getNavigationDataView(normalizedNavigationSpec, savedIds),
    prepare,
  };
};
