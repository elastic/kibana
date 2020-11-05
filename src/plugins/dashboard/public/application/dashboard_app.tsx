/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { i18n } from '@kbn/i18n';
import React, { useEffect, useCallback, useState } from 'react';

import _, { uniqBy } from 'lodash';
import deepEqual from 'fast-deep-equal';
import {
  debounceTime,
  distinctUntilChanged,
  filter,
  map,
  mapTo,
  startWith,
  switchMap,
} from 'rxjs/operators';
import { merge, Observable, pipe, Subscription } from 'rxjs';
import { getSavedObjectFinder, SavedObject } from '../../../saved_objects/public';
import { DashboardStateManager } from './dashboard_state_manager';
import { createKbnUrlStateStorage, withNotifyOnErrors } from '../../../kibana_utils/public';
import {
  DashboardAppComponentActiveState,
  DashboardAppComponentState,
  DashboardAppProps,
  DashboardAppServices,
  DashboardCapabilities,
} from './types';
import { useKibana } from '../../../kibana_react/public';
import { DashboardSavedObject } from '../saved_dashboards';
import { migrateLegacyQuery } from './lib/migrate_legacy_query';
import {
  connectToQueryState,
  esFilters,
  FilterManager,
  IndexPattern,
  IndexPatternsContract,
  QueryStart,
  QueryState,
  syncQueryStateWithUrl,
} from '../../../data/public';
import {
  ContainerOutput,
  EmbeddableFactoryNotFoundError,
  ErrorEmbeddable,
  isErrorEmbeddable,
  openAddPanelFlyout,
  ViewMode,
} from '../../../embeddable/public';
import { DashboardPanelState, DASHBOARD_CONTAINER_TYPE } from '.';
import { convertSavedDashboardPanelToPanelState } from './lib/embeddable_saved_object_converters';
import { DashboardTopNav } from './top_nav/dashboard_top_nav';
import { getDashboardTitle } from './dashboard_strings';
import type { TagDecoratedSavedObject } from '../../../saved_objects_tagging_oss/public';
import { DashboardEmptyScreen } from './dashboard_empty_screen';
import { DashboardContainer, DashboardContainerInput, SavedDashboardPanel } from '..';

// enum UrlParams {
//   SHOW_TOP_MENU = 'show-top-menu',
//   SHOW_QUERY_INPUT = 'show-query-input',
//   SHOW_TIME_FILTER = 'show-time-filter',
//   SHOW_FILTER_BAR = 'show-filter-bar',
//   HIDE_FILTER_BAR = 'hide-filter-bar',
// }

// interface UrlParamsSelectedMap {
//   [UrlParams.SHOW_TOP_MENU]: boolean;
//   [UrlParams.SHOW_QUERY_INPUT]: boolean;
//   [UrlParams.SHOW_TIME_FILTER]: boolean;
//   [UrlParams.SHOW_FILTER_BAR]: boolean;
// }

// interface UrlParamValues extends Omit<UrlParamsSelectedMap, UrlParams.SHOW_FILTER_BAR> {
//   [UrlParams.HIDE_FILTER_BAR]: boolean;
// }

const getChangesFromAppStateForContainerState = ({
  dashboardContainer,
  appStateDashboardInput,
}: {
  dashboardContainer: DashboardContainer;
  appStateDashboardInput: DashboardContainerInput;
}) => {
  if (!dashboardContainer || isErrorEmbeddable(dashboardContainer)) {
    return appStateDashboardInput;
  }
  const containerInput = dashboardContainer.getInput();
  const differences: Partial<DashboardContainerInput> = {};

  // Filters shouldn't  be compared using regular isEqual
  if (
    !esFilters.compareFilters(
      containerInput.filters,
      appStateDashboardInput.filters,
      esFilters.COMPARE_ALL_OPTIONS
    )
  ) {
    differences.filters = appStateDashboardInput.filters;
  }

  Object.keys(_.omit(containerInput, ['filters', 'searchSessionId'])).forEach((key) => {
    const containerValue = (containerInput as { [key: string]: unknown })[key];
    const appStateValue = ((appStateDashboardInput as unknown) as { [key: string]: unknown })[key];
    if (!_.isEqual(containerValue, appStateValue)) {
      (differences as { [key: string]: unknown })[key] = appStateValue;
    }
  });

  // cloneDeep hack is needed, as there are multiple place, where container's input mutated,
  // but values from appStateValue are deeply frozen, as they can't be mutated directly
  return Object.values(differences).length === 0 ? undefined : _.cloneDeep(differences);
};

const getDashboardContainerInput = ({
  query,
  searchSessionId,
  dashboardStateManager,
  dashboardCapabilities,
}: {
  dashboardCapabilities: DashboardCapabilities;
  dashboardStateManager: DashboardStateManager;
  searchSessionId: string;
  query: QueryStart;
}): DashboardContainerInput => {
  const embeddablesMap: {
    [key: string]: DashboardPanelState;
  } = {};
  dashboardStateManager.getPanels().forEach((panel: SavedDashboardPanel) => {
    embeddablesMap[panel.panelIndex] = convertSavedDashboardPanelToPanelState(panel);
  });

  // If the incoming embeddable state's id already exists in the embeddables map, replace the input, retaining the existing gridData for that panel.
  // if (incomingEmbeddable?.embeddableId && embeddablesMap[incomingEmbeddable.embeddableId]) {
  //   const originalPanelState = embeddablesMap[incomingEmbeddable.embeddableId];
  //   embeddablesMap[incomingEmbeddable.embeddableId] = {
  //     gridData: originalPanelState.gridData,
  //     type: incomingEmbeddable.type,
  //     explicitInput: {
  //       ...originalPanelState.explicitInput,
  //       ...incomingEmbeddable.input,
  //       id: incomingEmbeddable.embeddableId,
  //     },
  //   };
  //   incomingEmbeddable = undefined;
  // }

  // const shouldShowEditHelp = getShouldShowEditHelp();
  // const shouldShowViewHelp = getShouldShowViewHelp();
  // const isEmptyInReadonlyMode = shouldShowUnauthorizedEmptyState();
  return {
    id: dashboardStateManager.savedDashboard.id || '',
    filters: query.filterManager.getFilters(),
    hidePanelTitles: dashboardStateManager.getHidePanelTitles(),
    query: query.queryString.getQuery(),
    searchSessionId,
    timeRange: {
      ..._.cloneDeep(query.timefilter.timefilter.getTime()),
    },
    refreshConfig: query.timefilter.timefilter.getRefreshInterval(),
    viewMode: dashboardStateManager.getViewMode(),
    panels: embeddablesMap,
    isFullScreenMode: dashboardStateManager.getFullScreenMode(),
    // isEmbeddedExternally,
    // isEmptyState: shouldShowEditHelp || shouldShowViewHelp || isEmptyInReadonlyMode,
    useMargins: dashboardStateManager.getUseMargins(),
    // lastReloadRequestTime,
    dashboardCapabilities,
    title: dashboardStateManager.getTitle(),
    description: dashboardStateManager.getDescription(),
    expandedPanelId: dashboardStateManager.getExpandedPanelId(),
  };
};

const getInputSubscription = (props: {
  dashboardContainer: DashboardContainer;
  dashboardStateManager: DashboardStateManager;
  filterManager: FilterManager;
}) => {
  const { dashboardContainer, dashboardStateManager, filterManager } = props;
  return dashboardContainer.getInput$().subscribe(() => {
    // let dirty = false;

    // This has to be first because handleDashboardContainerChanges causes
    // appState.save which will cause refreshDashboardContainer to be called.

    if (
      !esFilters.compareFilters(
        dashboardContainer.getInput().filters,
        filterManager.getFilters(),
        esFilters.COMPARE_ALL_OPTIONS
      )
    ) {
      // Add filters modifies the object passed to it, hence the clone deep.
      filterManager.addFilters(_.cloneDeep(dashboardContainer.getInput().filters));

      dashboardStateManager.applyFilters(
        dashboardStateManager.getQuery(),
        dashboardContainer.getInput().filters
      );
    }

    dashboardStateManager.handleDashboardContainerChanges(dashboardContainer);
    // $scope.$evalAsync(() => {
    //   if (dirty) {
    //     updateState();
    //   }
    // });
  });
};

const getOutputSubscription = (props: {
  dashboardContainer: DashboardContainer;
  indexPatterns: IndexPatternsContract;
  onUpdateIndexPatterns: (newIndexPatterns: IndexPattern[]) => void;
}) => {
  const { dashboardContainer, indexPatterns, onUpdateIndexPatterns } = props;

  const updateIndexPatternsOperator = pipe(
    filter((container: DashboardContainer) => !!container && !isErrorEmbeddable(container)),
    map((container: DashboardContainer): IndexPattern[] => {
      let panelIndexPatterns: IndexPattern[] = [];
      Object.values(container.getChildIds()).forEach((id) => {
        const embeddableInstance = container.getChild(id);
        if (isErrorEmbeddable(embeddableInstance)) return;
        const embeddableIndexPatterns = (embeddableInstance.getOutput() as any).indexPatterns;
        if (!embeddableIndexPatterns) return;
        panelIndexPatterns.push(...embeddableIndexPatterns);
      });
      panelIndexPatterns = uniqBy(panelIndexPatterns, 'id');
      return panelIndexPatterns;
    }),
    distinctUntilChanged((a, b) =>
      deepEqual(
        a.map((ip) => ip.id),
        b.map((ip) => ip.id)
      )
    ),
    // using switchMap for previous task cancellation
    switchMap((panelIndexPatterns: IndexPattern[]) => {
      return new Observable((observer) => {
        if (panelIndexPatterns && panelIndexPatterns.length > 0) {
          if (observer.closed) return;
          onUpdateIndexPatterns(panelIndexPatterns);
          observer.complete();
        } else {
          indexPatterns.getDefault().then((defaultIndexPattern) => {
            if (observer.closed) return;
            onUpdateIndexPatterns([defaultIndexPattern as IndexPattern]);
            observer.complete();
          });
        }
      });
    })
  );

  return merge(
    // output of dashboard container itself
    dashboardContainer.getOutput$(),
    // plus output of dashboard container children,
    // children may change, so make sure we subscribe/unsubscribe with switchMap
    dashboardContainer.getOutput$().pipe(
      map(() => dashboardContainer!.getChildIds()),
      distinctUntilChanged(deepEqual),
      switchMap((newChildIds: string[]) =>
        merge(...newChildIds.map((childId) => dashboardContainer!.getChild(childId).getOutput$()))
      )
    )
  )
    .pipe(
      mapTo(dashboardContainer),
      startWith(dashboardContainer), // to trigger initial index pattern update
      updateIndexPatternsOperator
    )
    .subscribe();
};

const getFiltersSubscription = (props: {
  query: QueryStart;
  dashboardContainer: DashboardContainer;
  dashboardStateManager: DashboardStateManager;
}) => {
  const { dashboardStateManager, query } = props;
  return merge(query.filterManager.getUpdates$(), query.queryString.getUpdates$())
    .pipe(debounceTime(100))
    .subscribe(() => {
      dashboardStateManager.applyFilters(
        query.queryString.getQuery(),
        query.filterManager.getFilters()
      );
    });
};

const isActiveState = (
  testState: DashboardAppComponentState
): testState is DashboardAppComponentActiveState => {
  return Boolean(
    testState.dashboardContainer &&
      testState.dashboardStateManager &&
      testState.indexPatterns &&
      testState.savedDashboard
  );
};

export function DashboardApp({
  savedDashboardId,
  history,
  redirectToDashboard,
  embedSettings,
}: DashboardAppProps) {
  const {
    core,
    chrome,
    // localStorage,
    embeddable,
    data,
    uiSettings,
    // savedObjects,
    savedDashboards,
    initializerContext,
    indexPatterns,
    // navigation,
    dashboardCapabilities,
    // savedObjectsClient,
    // setHeaderActionMenu,
    // navigateToDefaultApp,
    // savedQueryService,
    // navigateToLegacyKibanaUrl,
    // addBasePath,
    // scopedHistory,
    // restorePreviousUrl,
    // embeddableCapabilities,
    savedObjectsTagging,
    usageCollection,
    // share,
  } = useKibana<DashboardAppServices>().services;

  const [state, setState] = useState<DashboardAppComponentState>({});

  const refreshDashboardContainer = useCallback(() => {
    if (!state.dashboardContainer || !state.dashboardStateManager) {
      return;
    }
    const changes = getChangesFromAppStateForContainerState({
      dashboardContainer: state.dashboardContainer,
      appStateDashboardInput: getDashboardContainerInput({
        dashboardStateManager: state.dashboardStateManager,
        searchSessionId: data.search.session.start(),
        dashboardCapabilities,
        query: data.query,
      }),
    });
    if (changes) {
      state.dashboardContainer.updateInput(changes);
    }
  }, [
    data.query,
    data.search.session,
    dashboardCapabilities,
    state.dashboardContainer,
    state.dashboardStateManager,
  ]);

  const addFromLibrary = useCallback(() => {
    if (state.dashboardContainer && !isErrorEmbeddable(state.dashboardContainer)) {
      openAddPanelFlyout({
        embeddable: state.dashboardContainer,
        getAllFactories: embeddable.getEmbeddableFactories,
        getFactory: embeddable.getEmbeddableFactory,
        notifications: core.notifications,
        overlays: core.overlays,
        SavedObjectFinder: getSavedObjectFinder(core.savedObjects, uiSettings),
      });
    }
  }, [
    embeddable.getEmbeddableFactories,
    embeddable.getEmbeddableFactory,
    state.dashboardContainer,
    core.notifications,
    core.savedObjects,
    core.overlays,
    uiSettings,
  ]);

  const createNew = useCallback(async () => {
    const type = 'visualization';
    const factory = embeddable.getEmbeddableFactory(type);
    if (!factory) {
      throw new EmbeddableFactoryNotFoundError(type);
    }
    const explicitInput = await factory.getExplicitInput();
    if (state.dashboardContainer) {
      await state.dashboardContainer.addNewEmbeddable(type, explicitInput);
    }
  }, [state.dashboardContainer, embeddable]);

  const updateViewMode = useCallback(
    (newMode: ViewMode) => {
      state.dashboardStateManager?.switchViewMode(newMode);
    },
    [state.dashboardStateManager?.switchViewMode]
  );

  // Load Saved Dashboard
  useEffect(() => {
    data.indexPatterns
      .ensureDefaultIndexPattern()
      ?.then(() => savedDashboards.get(savedDashboardId) as Promise<DashboardSavedObject>)
      .then((savedDashboard) => {
        // if you've loaded an existing dashboard, add it to the recently accessed
        if (savedDashboardId) {
          chrome.recentlyAccessed.add(
            savedDashboard.getFullPath(),
            savedDashboard.title,
            savedDashboardId
          );
        }
        setState((s) => ({ ...s, savedDashboard }));
      });
  }, [savedDashboardId, savedDashboards, chrome.recentlyAccessed, data.indexPatterns]);

  // Build Dashboard State Manager and Dashboard Container when Saved Dashboard changes
  useEffect(() => {
    if (!state.savedDashboard) {
      return;
    }

    const filterManager = data.query.filterManager;
    const timefilter = data.query.timefilter.timefilter;
    const queryStringManager = data.query.queryString;

    const kbnUrlStateStorage = createKbnUrlStateStorage({
      history,
      useHash: uiSettings.get('state:storeInSessionStorage'),
      ...withNotifyOnErrors(core.notifications.toasts),
    });

    // TS is picky with type guards, we can't just inline `() => false`
    function defaultTaggingGuard(obj: SavedObject): obj is TagDecoratedSavedObject {
      return false;
    }

    const dashboardStateManager = new DashboardStateManager({
      hasTaggingCapabilities: savedObjectsTagging?.ui.hasTagDecoration ?? defaultTaggingGuard,
      hideWriteControls: dashboardCapabilities.hideWriteControls,
      kibanaVersion: initializerContext.env.packageInfo.version,
      savedDashboard: state.savedDashboard,
      kbnUrlStateStorage,
      usageCollection,
      history,
    });

    // sync initial app filters from state to filterManager
    // if there is an existing similar global filter, then leave it as global
    filterManager.setAppFilters(_.cloneDeep(dashboardStateManager.appState.filters));
    queryStringManager.setQuery(migrateLegacyQuery(dashboardStateManager.appState.query));

    // setup syncing of app filters between appState and filterManager
    const stopSyncingAppFilters = connectToQueryState(
      data.query,
      {
        set: ({ filters, query }) => {
          dashboardStateManager.setFilters(filters || []);
          dashboardStateManager.setQuery(query || queryStringManager.getDefaultQuery());
        },
        get: () => ({
          filters: dashboardStateManager.appState.filters,
          query: dashboardStateManager.getQuery(),
        }),
        state$: dashboardStateManager.appState$.pipe(
          map((appState) => ({
            filters: appState.filters,
            query: queryStringManager.formatQuery(appState.query),
          }))
        ),
      },
      {
        filters: esFilters.FilterStateStore.APP_STATE,
        query: true,
      }
    );

    // The hash check is so we only update the time filter on dashboard open, not during
    // normal cross app navigation.
    if (dashboardStateManager.getIsTimeSavedWithDashboard()) {
      const initialGlobalStateInUrl = kbnUrlStateStorage.get<QueryState>('_g');
      if (!initialGlobalStateInUrl?.time) {
        dashboardStateManager.syncTimefilterWithDashboardTime(timefilter);
      }
      if (!initialGlobalStateInUrl?.refreshInterval) {
        dashboardStateManager.syncTimefilterWithDashboardRefreshInterval(timefilter);
      }
    }

    // starts syncing `_g` portion of url with query services
    // it is important to start this syncing after `dashboardStateManager.syncTimefilterWithDashboard(timefilter);` above is run,
    // otherwise it will case redundant browser history records
    const { stop: stopSyncingQueryServiceStateWithUrl } = syncQueryStateWithUrl(
      data.query,
      kbnUrlStateStorage
    );

    // starts syncing `_a` portion of url
    dashboardStateManager.startStateSyncing();

    // Load dashboard container
    const dashboardFactory = embeddable.getEmbeddableFactory<
      DashboardContainerInput,
      ContainerOutput,
      DashboardContainer
    >(DASHBOARD_CONTAINER_TYPE);
    if (!dashboardFactory) {
      throw new EmbeddableFactoryNotFoundError(
        'dashboard app requires dashboard embeddable factory'
      );
    }
    dashboardFactory
      .create(
        getDashboardContainerInput({
          searchSessionId: data.search.session.start(),
          dashboardStateManager,
          dashboardCapabilities,
          query: data.query,
        })
      )
      .then((dashboardContainer: DashboardContainer | ErrorEmbeddable | undefined) => {
        if (
          !dashboardContainer ||
          isErrorEmbeddable(dashboardContainer) ||
          !dashboardStateManager
        ) {
          return;
        }
        setState((s) => ({ ...s, dashboardContainer, dashboardStateManager }));
      });

    return () => {
      dashboardStateManager.destroy();
      stopSyncingAppFilters();
      stopSyncingQueryServiceStateWithUrl();
    };
  }, [
    history,
    embeddable,
    uiSettings,
    data.query,
    usageCollection,
    data.search.session,
    state.savedDashboard,
    dashboardCapabilities,
    core.notifications.toasts,
    savedObjectsTagging?.ui.hasTagDecoration,
    initializerContext.env.packageInfo.version,
  ]);

  // Render Dashboard Container and manage subscriptions
  useEffect(() => {
    if (!state.dashboardStateManager || !state.dashboardContainer) {
      return;
    }

    const dashboardStateManager = state.dashboardStateManager;
    const dashboardContainer = state.dashboardContainer;
    const subscriptions = new Subscription();

    subscriptions.add(
      getInputSubscription({
        dashboardContainer,
        dashboardStateManager,
        filterManager: data.query.filterManager,
      })
    );
    subscriptions.add(
      getOutputSubscription({
        dashboardContainer,
        indexPatterns,
        onUpdateIndexPatterns: (newIndexPatterns) => {
          setState((s) => {
            return {
              ...s,
              indexPatterns: newIndexPatterns,
            };
          });
        },
      })
    );
    subscriptions.add(
      getFiltersSubscription({
        query: data.query,
        dashboardContainer,
        dashboardStateManager,
      })
    );
    dashboardStateManager.registerChangeListener(() => {
      // we aren't checking dirty state because there are changes the container needs to know about
      // that won't make the dashboard "dirty" - like a view mode change.
      refreshDashboardContainer();
    });

    dashboardContainer.renderEmptyScreen = () => {
      const isEditMode = dashboardContainer.getInput().viewMode !== ViewMode.VIEW;
      return (
        <DashboardEmptyScreen
          isReadonlyMode={dashboardContainer.getInput().dashboardCapabilities?.hideWriteControls}
          onLinkClick={isEditMode ? addFromLibrary : () => updateViewMode(ViewMode.EDIT)}
          onVisualizeClick={createNew}
          showLinkToVisualize={isEditMode}
          uiSettings={uiSettings}
          http={core.http}
        />
      );
    };
    dashboardContainer.render(document.getElementById('dashboardViewport')!);

    return () => {
      dashboardContainer?.destroy();
      subscriptions.unsubscribe();
      data.search.session.clear();
    };
  }, [
    createNew,
    core.http,
    uiSettings,
    data.query,
    indexPatterns,
    addFromLibrary,
    updateViewMode,
    data.search.session,
    state.dashboardContainer,
    refreshDashboardContainer,
    state.dashboardStateManager,
  ]);

  // Sync breadcrumbs when Dashboard State Manager changes
  useEffect(() => {
    if (!state.dashboardStateManager) {
      return;
    }
    chrome.setBreadcrumbs([
      {
        text: i18n.translate('dashboard.dashboardAppBreadcrumbsTitle', {
          defaultMessage: 'Dashboard',
        }),
        onClick: () => {
          redirectToDashboard({ listingFilter: '' });
        },
      },
      {
        text: getDashboardTitle(
          state.dashboardStateManager.getTitle(),
          state.dashboardStateManager.getViewMode(),
          state.dashboardStateManager.getIsDirty(data.query.timefilter.timefilter),
          state.dashboardStateManager.isNew()
        ),
      },
    ]);
  }, [state.dashboardStateManager, chrome, data.query.timefilter.timefilter, redirectToDashboard]);

  return (
    <>
      {isActiveState(state) && (
        <DashboardTopNav
          createNew={createNew}
          embedSettings={embedSettings}
          updateViewMode={updateViewMode}
          addFromLibrary={addFromLibrary}
          lastDashboardId={savedDashboardId}
          indexPatterns={state.indexPatterns}
          savedDashboard={state.savedDashboard}
          redirectToDashboard={redirectToDashboard}
          timefilter={data.query.timefilter.timefilter}
          dashboardContainer={state.dashboardContainer}
          refreshDashboardContainer={refreshDashboardContainer}
          dashboardStateManager={state.dashboardStateManager}
        />
      )}
      <div id="dashboardViewport" />
    </>
  );
}
