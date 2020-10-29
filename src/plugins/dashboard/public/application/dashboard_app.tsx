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
import { DashboardStateManager } from './dashboard_state_manager';
import { SavedObjectNotFound } from '../../../kibana_utils/public';
import {
  DashboardAppComponentActiveState,
  DashboardAppComponentState,
  DashboardAppProps,
  DashboardAppServices,
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
} from '../../../embeddable/public';
import { DashboardPanelState, DASHBOARD_CONTAINER_TYPE } from '.';
import { convertSavedDashboardPanelToPanelState } from './lib/embeddable_saved_object_converters';
import { DashboardTopNav } from './top_nav/dashboard_top_nav';
import {
  DashboardConstants,
  DashboardContainer,
  DashboardContainerInput,
  SavedDashboardPanel,
} from '..';
import { getDashboardTitle } from './dashboard_strings';

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

  Object.keys(_.omit(containerInput, ['filters'])).forEach((key) => {
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
  dashboardStateManager,
  query,
}: {
  dashboardStateManager: DashboardStateManager;
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
  const { dashboardContainer, dashboardStateManager, query } = props;
  return merge(query.filterManager.getUpdates$(), query.queryString.getUpdates$())
    .pipe(debounceTime(100))
    .subscribe(() => {
      dashboardStateManager.applyFilters(
        query.queryString.getQuery(),
        query.filterManager.getFilters()
      );

      // TODO: Anton says we don't need this...
      // dashboardContainer.updateInput({
      //   filters: query.filterManager.getFilters(),
      //   query: query.queryString.getQuery(),
      // });
    });
};

export function DashboardApp({
  savedDashboardId,
  history,
  kbnUrlStateStorage,
  redirectToDashboard,
  embedSettings,
}: DashboardAppProps) {
  const {
    core,
    chrome,
    // localStorage,
    embeddable,
    data,
    // uiSettings,
    // savedObjects,
    savedDashboards,
    initializerContext,
    indexPatterns,
    // navigation,
    // dashboardCapabilities,
    // savedObjectsClient,
    dashboardConfig,
    // setHeaderActionMenu,
    // navigateToDefaultApp,
    // savedQueryService,
    // navigateToLegacyKibanaUrl,
    // addBasePath,
    // scopedHistory,
    // restorePreviousUrl,
    // embeddableCapabilities,
    usageCollection,
    // share,
  } = useKibana<DashboardAppServices>().services;

  const [state, setState] = useState<DashboardAppComponentState>({});

  const isActiveState = (
    testState: DashboardAppComponentState
  ): testState is DashboardAppComponentActiveState => {
    return Boolean(
      testState.initialized &&
        testState.dashboardContainer &&
        testState.dashboardStateManager &&
        testState.indexPatterns &&
        testState.savedDashboard
    );
  };

  const refreshDashboardContainer = useCallback(() => {
    if (!isActiveState(state)) {
      return;
    }
    const { dashboardStateManager, dashboardContainer } = state;
    const changes = getChangesFromAppStateForContainerState({
      appStateDashboardInput: getDashboardContainerInput({
        dashboardStateManager,
        query: data.query,
      }),
      dashboardContainer,
    });
    if (changes && dashboardContainer) {
      dashboardContainer.updateInput(changes);
    }
  }, [state, data.query]);

  const initializeStateSyncing = useCallback(
    ({ savedDashboard }: { savedDashboard: DashboardSavedObject }) => {
      const filterManager = data.query.filterManager;
      const timefilter = data.query.timefilter.timefilter;
      const queryStringManager = data.query.queryString;

      const dashboardStateManager = new DashboardStateManager({
        savedDashboard,
        hideWriteControls: dashboardConfig.getHideWriteControls(),
        kibanaVersion: initializerContext.env.packageInfo.version,
        kbnUrlStateStorage,
        history,
        usageCollection,
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

      return {
        dashboardStateManager,
        stopSyncingQueryServiceStateWithUrl,
        stopSyncingAppFilters,
      };
    },
    [
      kbnUrlStateStorage,
      dashboardConfig,
      history,
      usageCollection,
      initializerContext.env,
      data.query,
    ]
  );

  // Dashboard loading useEffect
  useEffect(() => {
    if (state?.savedDashboard?.id === savedDashboardId && state.initialized) {
      return;
    }
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

        const {
          dashboardStateManager,
          stopSyncingQueryServiceStateWithUrl,
          stopSyncingAppFilters,
        } = initializeStateSyncing({ savedDashboard });

        chrome.setBreadcrumbs([
          {
            text: i18n.translate('dashboard.dashboardAppBreadcrumbsTitle', {
              defaultMessage: 'Dashboard',
            }),
            href: DashboardConstants.LANDING_PAGE_PATH,
          },
          {
            text: getDashboardTitle(
              dashboardStateManager.getTitle(),
              dashboardStateManager.getViewMode(),
              dashboardStateManager.getIsDirty(data.query.timefilter.timefilter),
              dashboardStateManager.isNew()
            ),
          },
        ]);

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

        const subscriptions = new Subscription();
        dashboardFactory
          .create(getDashboardContainerInput({ dashboardStateManager, query: data.query }))
          .then((dashboardContainer: DashboardContainer | ErrorEmbeddable | undefined) => {
            if (!dashboardContainer || isErrorEmbeddable(dashboardContainer)) {
              return;
            }

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
                  setState((s) => ({
                    ...s,
                    indexPatterns: newIndexPatterns,
                  }));
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

            setState({
              dashboardContainer,
              dashboardStateManager,
              savedDashboard,
              initialized: true,
            });

            dashboardContainer.render(document.getElementById('dashboardViewport')!);
          });

        return () => {
          dashboardStateManager.destroy();
          state.dashboardContainer?.destroy();
          subscriptions.unsubscribe();
          stopSyncingQueryServiceStateWithUrl();
          stopSyncingAppFilters();
        };
      })
      .catch((error) => {
        // Preserve BWC of v5.3.0 links for new, unsaved dashboards.
        // See https://github.com/elastic/kibana/issues/10951 for more context.
        if (error instanceof SavedObjectNotFound && savedDashboardId === 'create') {
          // Note preserve querystring part is necessary so the state is preserved through the redirect.

          // I am not sure that I need to do this anymore
          history.replace({
            ...history.location, // preserve query,
            pathname: DashboardConstants.CREATE_NEW_DASHBOARD_URL,
          });
          core.notifications.toasts.addWarning(
            i18n.translate('dashboard.urlWasRemovedInSixZeroWarningMessage', {
              defaultMessage:
                'The url "dashboard/create" was removed in 6.0. Please update your bookmarks.',
            })
          );
          return new Promise(() => {});
        } else {
          // E.g. a corrupt or deleted dashboard
          core.notifications.toasts.addDanger(error.message);
          history.push(DashboardConstants.LANDING_PAGE_PATH);
          return new Promise(() => {});
        }
      });
  }, [
    savedDashboardId,
    state.savedDashboard?.id,
    refreshDashboardContainer,
    embeddable,
    data.query,
    history,
    savedDashboards,
    data.indexPatterns,
    chrome.recentlyAccessed,
    indexPatterns,
    core.notifications.toasts,
    data.query.filterManager,
    state.dashboardContainer?.destroy,
    initializeStateSyncing,
  ]);

  return (
    <>
      {isActiveState(state) && (
        <DashboardTopNav
          refreshDashboardContainer={refreshDashboardContainer}
          indexPatterns={state.indexPatterns}
          dashboardStateManager={state.dashboardStateManager}
          timefilter={data.query.timefilter.timefilter}
          savedDashboard={state.savedDashboard}
          dashboardContainer={state.dashboardContainer}
          redirectToDashboard={redirectToDashboard}
          lastDashboardId={savedDashboardId}
          embedSettings={embedSettings}
        />
      )}
      <div id="dashboardViewport" />
    </>
  );
}
