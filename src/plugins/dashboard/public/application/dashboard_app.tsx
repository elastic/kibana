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
import { distinctUntilChanged, filter, map, mapTo, startWith, switchMap } from 'rxjs/operators';
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
  IndexPattern,
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

enum UrlParams {
  SHOW_TOP_MENU = 'show-top-menu',
  SHOW_QUERY_INPUT = 'show-query-input',
  SHOW_TIME_FILTER = 'show-time-filter',
  SHOW_FILTER_BAR = 'show-filter-bar',
  HIDE_FILTER_BAR = 'hide-filter-bar',
}

interface UrlParamsSelectedMap {
  [UrlParams.SHOW_TOP_MENU]: boolean;
  [UrlParams.SHOW_QUERY_INPUT]: boolean;
  [UrlParams.SHOW_TIME_FILTER]: boolean;
  [UrlParams.SHOW_FILTER_BAR]: boolean;
}

// interface UrlParamValues extends Omit<UrlParamsSelectedMap, UrlParams.SHOW_FILTER_BAR> {
//   [UrlParams.HIDE_FILTER_BAR]: boolean;
// }

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
    uiSettings,
    // savedObjects,
    savedDashboards,
    initializerContext,
    indexPatterns,
    navigation,
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
      testState.dashboardContainer &&
        testState.dashboardStateManager &&
        testState.indexPatterns &&
        testState.savedDashboard
    );
  };

  const initializeStateSyncing = useCallback(
    (savedDashboard: DashboardSavedObject) => {
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

  const getDashboardInput = useCallback(
    ({
      dashboardStateManager,
    }: {
      dashboardStateManager: DashboardStateManager;
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
        filters: data.query.filterManager.getFilters(),
        hidePanelTitles: dashboardStateManager.getHidePanelTitles(),
        query: data.query.queryString.getQuery(),
        timeRange: {
          ..._.cloneDeep(data.query.timefilter.timefilter.getTime()),
        },
        refreshConfig: data.query.timefilter.timefilter.getRefreshInterval(),
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
    },
    [data.query]
  );

  const getInputSubscription = useCallback(
    (props: {
      dashboardContainer: DashboardContainer;
      dashboardStateManager: DashboardStateManager;
    }) => {
      const { dashboardContainer, dashboardStateManager } = props;
      return dashboardContainer.getInput$().subscribe(() => {
        // let dirty = false;

        // This has to be first because handleDashboardContainerChanges causes
        // appState.save which will cause refreshDashboardContainer to be called.

        if (
          !esFilters.compareFilters(
            dashboardContainer.getInput().filters,
            data.query.filterManager.getFilters(),
            esFilters.COMPARE_ALL_OPTIONS
          )
        ) {
          // Add filters modifies the object passed to it, hence the clone deep.
          data.query.filterManager.addFilters(_.cloneDeep(dashboardContainer.getInput().filters));

          // dashboardStateManager.applyFilters(
          //   // $scope.model.query,
          //   dashboardContainer.getInput().filters
          // );
          // dirty = true;
        }

        dashboardStateManager.handleDashboardContainerChanges(dashboardContainer);
        // $scope.$evalAsync(() => {
        //   if (dirty) {
        //     updateState();
        //   }
        // });
      });
    },
    [data.query.filterManager]
  );

  const getOutputSubscription = useCallback(
    (props: { dashboardContainer: DashboardContainer }) => {
      const { dashboardContainer } = props;

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
              setState((s) => ({ ...s, indexPatterns: panelIndexPatterns }));
              observer.complete();
            } else {
              indexPatterns.getDefault().then((defaultIndexPattern) => {
                if (observer.closed) return;
                setState((s) => ({ ...s, indexPatterns: [defaultIndexPattern as IndexPattern] }));
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
            merge(
              ...newChildIds.map((childId) => dashboardContainer!.getChild(childId).getOutput$())
            )
          )
        )
      )
        .pipe(
          mapTo(dashboardContainer),
          startWith(dashboardContainer), // to trigger initial index pattern update
          updateIndexPatternsOperator
        )
        .subscribe();
    },
    [indexPatterns]
  );

  // Dashboard loading useEffect
  useEffect(() => {
    if (state?.savedDashboard?.id && state?.savedDashboard?.id === savedDashboardId) {
      return;
    }

    let inputSubscription: Subscription | undefined;
    let outputSubscription: Subscription | undefined;

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
        } = initializeStateSyncing(savedDashboard);

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
          .create(getDashboardInput({ dashboardStateManager }))
          .then((dashboardContainer: DashboardContainer | ErrorEmbeddable | undefined) => {
            if (!dashboardContainer || isErrorEmbeddable(dashboardContainer)) {
              return;
            }

            inputSubscription = getInputSubscription({ dashboardContainer, dashboardStateManager });
            outputSubscription = getOutputSubscription({ dashboardContainer });

            setState({
              dashboardContainer,
              dashboardStateManager,
              savedDashboard,
            });

            dashboardContainer.render(document.getElementById('dashboardViewport')!);
          });

        return () => {
          dashboardStateManager.destroy();
          state.dashboardContainer?.destroy();
          inputSubscription?.unsubscribe();
          outputSubscription?.unsubscribe();
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
    state?.savedDashboard?.id,
    embeddable,
    history,
    savedDashboards,
    data.indexPatterns,
    chrome.recentlyAccessed,
    core.notifications.toasts,
    data.query.filterManager,
    state.dashboardContainer?.destroy,
    initializeStateSyncing,
    getDashboardInput,
    getInputSubscription,
    getOutputSubscription,
  ]);

  return (
    <>
      {isActiveState(state) && (
        <DashboardTopNav
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
