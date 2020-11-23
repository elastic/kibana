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

import React, { useEffect, useCallback, useState } from 'react';
import { History } from 'history';

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
import { EUI_MODAL_CANCEL_BUTTON } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import ReactDOM from 'react-dom';
import { getSavedObjectFinder, SavedObject } from '../../../saved_objects/public';
import { DashboardStateManager } from './dashboard_state_manager';
import {
  createKbnUrlStateStorage,
  getQueryParams,
  removeQueryParam,
  SavedObjectNotFound,
  withNotifyOnErrors,
} from '../../../kibana_utils/public';
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
  EmbeddableInput,
  EmbeddablePackageState,
  ErrorEmbeddable,
  isErrorEmbeddable,
  openAddPanelFlyout,
  ViewMode,
} from '../../../embeddable/public';
import { DashboardPanelState, DASHBOARD_CONTAINER_TYPE } from '.';
import { convertSavedDashboardPanelToPanelState } from '../../common/embeddable/embeddable_saved_object_converters';
import { DashboardTopNav } from './top_nav/dashboard_top_nav';
import { dashboardBreadcrumb, getDashboardTitle, leaveConfirmStrings } from './dashboard_strings';
import type { TagDecoratedSavedObject } from '../../../saved_objects_tagging_oss/public';
import { DashboardEmptyScreen } from './empty_screen/dashboard_empty_screen';
import {
  DashboardConstants,
  DashboardContainer,
  DashboardContainerInput,
  SavedDashboardPanel,
} from '..';

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

  Object.keys(
    _.omit(containerInput, ['filters', 'searchSessionId', 'lastReloadRequestTime'])
  ).forEach((key) => {
    const containerValue = (containerInput as { [key: string]: unknown })[key];
    const appStateValue = ((appStateDashboardInput as unknown) as { [key: string]: unknown })[key];
    if (!_.isEqual(containerValue, appStateValue)) {
      (differences as { [key: string]: unknown })[key] = appStateValue;
    }
  });

  // last reload request time can be undefined without causing a refresh
  if (
    appStateDashboardInput.lastReloadRequestTime &&
    containerInput.lastReloadRequestTime !== appStateDashboardInput.lastReloadRequestTime
  ) {
    differences.lastReloadRequestTime = appStateDashboardInput.lastReloadRequestTime;
  }

  // cloneDeep hack is needed, as there are multiple place, where container's input mutated,
  // but values from appStateValue are deeply frozen, as they can't be mutated directly
  return Object.values(differences).length === 0 ? undefined : _.cloneDeep(differences);
};

const getDashboardContainerInput = ({
  query,
  searchSessionId,
  incomingEmbeddable,
  isEmbeddedExternally,
  lastReloadRequestTime,
  dashboardStateManager,
  dashboardCapabilities,
}: {
  dashboardCapabilities: DashboardCapabilities;
  dashboardStateManager: DashboardStateManager;
  incomingEmbeddable?: EmbeddablePackageState;
  lastReloadRequestTime?: number;
  isEmbeddedExternally: boolean;
  searchSessionId?: string;
  query: QueryStart;
}): DashboardContainerInput => {
  const embeddablesMap: {
    [key: string]: DashboardPanelState;
  } = {};
  dashboardStateManager.getPanels().forEach((panel: SavedDashboardPanel) => {
    embeddablesMap[panel.panelIndex] = convertSavedDashboardPanelToPanelState(panel);
  });

  // If the incoming embeddable state's id already exists in the embeddables map, replace the input, retaining the existing gridData for that panel.
  if (incomingEmbeddable?.embeddableId && embeddablesMap[incomingEmbeddable.embeddableId]) {
    const originalPanelState = embeddablesMap[incomingEmbeddable.embeddableId];
    embeddablesMap[incomingEmbeddable.embeddableId] = {
      gridData: originalPanelState.gridData,
      type: incomingEmbeddable.type,
      explicitInput: {
        ...originalPanelState.explicitInput,
        ...incomingEmbeddable.input,
        id: incomingEmbeddable.embeddableId,
      },
    };
  }

  return {
    id: dashboardStateManager.savedDashboard.id || '',
    filters: query.filterManager.getFilters(),
    hidePanelTitles: dashboardStateManager.getHidePanelTitles(),
    query: dashboardStateManager.getQuery(),
    searchSessionId,
    timeRange: {
      ..._.cloneDeep(query.timefilter.timefilter.getTime()),
    },
    refreshConfig: query.timefilter.timefilter.getRefreshInterval(),
    viewMode: dashboardStateManager.getViewMode(),
    panels: embeddablesMap,
    isFullScreenMode: dashboardStateManager.getFullScreenMode(),
    isEmbeddedExternally,
    useMargins: dashboardStateManager.getUseMargins(),
    lastReloadRequestTime,
    dashboardCapabilities,
    title: dashboardStateManager.getTitle(),
    description: dashboardStateManager.getDescription(),
    expandedPanelId: dashboardStateManager.getExpandedPanelId(),
  };
};

const getInputSubscription = ({
  dashboardContainer,
  dashboardStateManager,
  filterManager,
}: {
  dashboardContainer: DashboardContainer;
  dashboardStateManager: DashboardStateManager;
  filterManager: FilterManager;
}) =>
  dashboardContainer.getInput$().subscribe(() => {
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
  });

const getOutputSubscription = ({
  dashboardContainer,
  indexPatterns,
  onUpdateIndexPatterns,
}: {
  dashboardContainer: DashboardContainer;
  indexPatterns: IndexPatternsContract;
  onUpdateIndexPatterns: (newIndexPatterns: IndexPattern[]) => void;
}) => {
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

const getFiltersSubscription = ({
  query,
  dashboardStateManager,
}: {
  query: QueryStart;
  dashboardStateManager: DashboardStateManager;
}) => {
  return merge(query.filterManager.getUpdates$(), query.queryString.getUpdates$())
    .pipe(debounceTime(100))
    .subscribe(() => {
      dashboardStateManager.applyFilters(
        query.queryString.getQuery(),
        query.filterManager.getFilters()
      );
    });
};

const getSearchSessionIdFromURL = (history: History): string | undefined =>
  getQueryParams(history.location)[DashboardConstants.SEARCH_SESSION_ID] as string | undefined;

const isActiveState = (s: DashboardAppComponentState): s is DashboardAppComponentActiveState => {
  return Boolean(
    s.dashboardContainer && s.dashboardStateManager && s.indexPatterns && s.savedDashboard
  );
};

export function DashboardApp({
  savedDashboardId,
  embedSettings,
  redirectTo,
  history,
}: DashboardAppProps) {
  const {
    data,
    core,
    chrome,
    onAppLeave,
    embeddable,
    uiSettings,
    scopedHistory,
    indexPatterns,
    savedDashboards,
    usageCollection,
    initializerContext,
    dashboardCapabilities,
    savedObjectsTagging,
  } = useKibana<DashboardAppServices>().services;

  const [state, setState] = useState<DashboardAppComponentState>({});
  const [lastReloadTime, setLastReloadTime] = useState(0);

  const refreshDashboardContainer = useCallback(
    (lastReloadRequestTime?: number) => {
      if (!state.dashboardContainer || !state.dashboardStateManager) {
        return;
      }
      const changes = getChangesFromAppStateForContainerState({
        dashboardContainer: state.dashboardContainer,
        appStateDashboardInput: getDashboardContainerInput({
          dashboardStateManager: state.dashboardStateManager,
          isEmbeddedExternally: Boolean(embedSettings),
          lastReloadRequestTime,
          dashboardCapabilities,
          query: data.query,
        }),
      });
      if (changes) {
        if (getSearchSessionIdFromURL(history)) {
          // going away from a background search results
          removeQueryParam(history, DashboardConstants.SEARCH_SESSION_ID, true);
        }

        state.dashboardContainer.updateInput({
          ...changes,
          searchSessionId: data.search.session.start(),
        });
      }
    },
    [
      history,
      data.query,
      embedSettings,
      data.search.session,
      dashboardCapabilities,
      state.dashboardContainer,
      state.dashboardStateManager,
    ]
  );

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
    [state.dashboardStateManager]
  );

  // Load Saved Dashboard
  useEffect(() => {
    data.indexPatterns
      .ensureDefaultIndexPattern()
      ?.then(() => savedDashboards.get(savedDashboardId) as Promise<DashboardSavedObject>)
      .then(async (savedDashboard) => {
        // if you've loaded an existing dashboard, add it to the recently accessed and update doc title
        if (savedDashboardId) {
          chrome.docTitle.change(savedDashboard.title);
          chrome.recentlyAccessed.add(
            savedDashboard.getFullPath(),
            savedDashboard.title,
            savedDashboardId
          );
        }
        setState((s) => ({
          savedDashboard,
        }));
      })
      .catch((error) => {
        // Preserve BWC of v5.3.0 links for new, unsaved dashboards.
        // See https://github.com/elastic/kibana/issues/10951 for more context.
        if (error instanceof SavedObjectNotFound && savedDashboardId === 'create') {
          // Note preserve querystring part is necessary so the state is preserved through the redirect.
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
        } else {
          // E.g. a corrupt or deleted dashboard
          core.notifications.toasts.addDanger(error.message);
          history.push(DashboardConstants.LANDING_PAGE_PATH);
        }
      });
    return () => {
      // clear state if it exists to prepare for new dashboard...
      setState((s) => {
        s.dashboardContainer?.destroy();
        s.dashboardStateManager?.destroy();
        return {};
      });
    };
  }, [
    chrome.recentlyAccessed,
    data.indexPatterns,
    core.notifications,
    savedDashboardId,
    savedDashboards,
    chrome.docTitle,
    history,
  ]);

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

    // Apply initial filters to Dashboard State Manager
    dashboardStateManager.applyFilters(
      dashboardStateManager.getQuery() || queryStringManager.getDefaultQuery(),
      filterManager.getFilters()
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
    const searchSessionIdFromURL = getSearchSessionIdFromURL(history);
    if (searchSessionIdFromURL) {
      data.search.session.restore(searchSessionIdFromURL);
    }
    // get incoming embeddable from the state transfer service.
    const incomingEmbeddable = embeddable
      .getStateTransfer(scopedHistory())
      .getIncomingEmbeddablePackage();

    dashboardFactory
      .create(
        getDashboardContainerInput({
          searchSessionId: searchSessionIdFromURL ?? data.search.session.start(),
          isEmbeddedExternally: Boolean(embedSettings),
          dashboardStateManager,
          dashboardCapabilities,
          incomingEmbeddable,
          query: data.query,
        })
      )
      .then((dashboardContainer: DashboardContainer | ErrorEmbeddable | undefined) => {
        if (!dashboardContainer || isErrorEmbeddable(dashboardContainer)) {
          return;
        }

        // If the incoming embeddable is newly created, or doesn't exist in the current panels list, add it with `addNewEmbeddable`
        if (
          incomingEmbeddable &&
          (!incomingEmbeddable?.embeddableId ||
            (incomingEmbeddable.embeddableId &&
              !dashboardContainer.getInput().panels[incomingEmbeddable.embeddableId]))
        ) {
          dashboardContainer.addNewEmbeddable<EmbeddableInput>(
            incomingEmbeddable.type,
            incomingEmbeddable.input
          );
        }
        setState((s) => ({ ...s, dashboardContainer, dashboardStateManager }));
      });

    return () => {
      stopSyncingAppFilters();
      stopSyncingQueryServiceStateWithUrl();
    };
  }, [
    history,
    embeddable,
    uiSettings,
    data.query,
    embedSettings,
    scopedHistory,
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
    const timeFilter = data.query.timefilter.timefilter;
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
        onUpdateIndexPatterns: (newIndexPatterns) =>
          setState((s) => ({ ...s, indexPatterns: newIndexPatterns })),
      })
    );
    subscriptions.add(
      getFiltersSubscription({
        query: data.query,
        dashboardStateManager,
      })
    );
    subscriptions.add(
      merge(
        ...[timeFilter.getRefreshIntervalUpdate$(), timeFilter.getTimeUpdate$()]
      ).subscribe(() => refreshDashboardContainer())
    );
    dashboardStateManager.registerChangeListener(() => {
      // we aren't checking dirty state because there are changes the container needs to know about
      // that won't make the dashboard "dirty" - like a view mode change.
      refreshDashboardContainer();
    });

    const dashboardViewport = document.getElementById('dashboardViewport');

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
    if (dashboardViewport) {
      dashboardContainer.render(dashboardViewport);
    }

    return () => {
      if (dashboardViewport) {
        ReactDOM.unmountComponentAtNode(dashboardViewport);
      }
      subscriptions.unsubscribe();
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
        text: dashboardBreadcrumb,
        'data-test-subj': 'dashboardListingBreadcrumb',
        onClick: () => {
          if (state.dashboardStateManager?.getIsDirty()) {
            core.overlays
              .openConfirm(leaveConfirmStrings.leaveSubtitle, {
                confirmButtonText: leaveConfirmStrings.confirmButtonText,
                cancelButtonText: leaveConfirmStrings.cancelButtonText,
                defaultFocusedButton: EUI_MODAL_CANCEL_BUTTON,
                title: leaveConfirmStrings.leaveTitle,
              })
              .then((isConfirmed) => {
                if (isConfirmed) {
                  redirectTo({ destination: 'listing' });
                }
              });
          } else {
            redirectTo({ destination: 'listing' });
          }
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
  }, [
    dashboardCapabilities.showWriteControls,
    state.dashboardStateManager,
    data.query.timefilter.timefilter,
    core.overlays,
    redirectTo,
    chrome,
  ]);

  // Build onAppLeave when Dashboard State Manager changes
  useEffect(() => {
    if (!state.dashboardStateManager || !state.dashboardContainer) {
      return;
    }
    onAppLeave((actions) => {
      if (
        state.dashboardStateManager?.getIsDirty() &&
        !state.dashboardContainer?.skipWarningOnAppLeave
      ) {
        // TODO: Finish App leave handler with overrides when redirecting to an editor.
        // return actions.confirm(leaveConfirmStrings.leaveSubtitle, leaveConfirmStrings.leaveTitle);
      }
      return actions.default();
    });
    return () => {
      // reset on app leave handler so the listing page doesn't trigger a confirmation
      onAppLeave((actions) => actions.default());
    };
  }, [state.dashboardStateManager, state.dashboardContainer, onAppLeave]);

  // Refresh the dashboard container when lastReloadTime changes
  useEffect(() => {
    refreshDashboardContainer(lastReloadTime);
  }, [lastReloadTime, refreshDashboardContainer]);

  return (
    <div className="app-container dshAppContainer">
      {isActiveState(state) && (
        <DashboardTopNav
          createNew={createNew}
          redirectTo={redirectTo}
          embedSettings={embedSettings}
          updateViewMode={updateViewMode}
          addFromLibrary={addFromLibrary}
          lastDashboardId={savedDashboardId}
          indexPatterns={state.indexPatterns}
          savedDashboard={state.savedDashboard}
          timefilter={data.query.timefilter.timefilter}
          dashboardContainer={state.dashboardContainer}
          dashboardStateManager={state.dashboardStateManager}
          onQuerySubmit={(_payload, isUpdate) => {
            if (isUpdate === false) {
              // The user can still request a reload in the query bar, even if the
              // query is the same, and in that case, we have to explicitly ask for
              // a reload, since no state changes will cause it.
              setLastReloadTime(() => new Date().getTime());
            }
          }}
        />
      )}
      <div id="dashboardViewport" />
    </div>
  );
}
