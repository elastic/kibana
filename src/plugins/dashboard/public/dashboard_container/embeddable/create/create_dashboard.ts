/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { cloneDeep, omit } from 'lodash';
import { Subject } from 'rxjs';
import { v4 } from 'uuid';

import { ContentInsightsClient } from '@kbn/content-management-content-insights-public';
import { GlobalQueryStateFromUrl, syncGlobalQueryStateWithUrl } from '@kbn/data-plugin/public';
import { ViewMode } from '@kbn/embeddable-plugin/public';
import { TimeRange } from '@kbn/es-query';
import { lazyLoadReduxToolsPackage } from '@kbn/presentation-util-plugin/public';

import {
  DashboardContainerInput,
  DashboardPanelMap,
  DashboardPanelState,
} from '../../../../common';
import {
  DEFAULT_DASHBOARD_INPUT,
  DEFAULT_PANEL_HEIGHT,
  DEFAULT_PANEL_WIDTH,
  GLOBAL_STATE_STORAGE_KEY,
  PanelPlacementStrategy,
} from '../../../dashboard_constants';
import {
  PANELS_CONTROL_GROUP_KEY,
  getDashboardBackupService,
} from '../../../services/dashboard_backup_service';
import { getDashboardContentManagementService } from '../../../services/dashboard_content_management_service';
import {
  LoadDashboardReturn,
  SavedDashboardInput,
} from '../../../services/dashboard_content_management_service/types';
import { coreServices, dataService, embeddableService } from '../../../services/kibana_services';
import { getDashboardCapabilities } from '../../../utils/get_dashboard_capabilities';
import { runPanelPlacementStrategy } from '../../panel_placement/place_new_panel_strategies';
import { startDiffingDashboardState } from '../../state/diffing/dashboard_diffing_integration';
import { UnsavedPanelState } from '../../types';
import { DashboardContainer } from '../dashboard_container';
import type { DashboardCreationOptions } from '../../..';
import { startSyncingDashboardDataViews } from './data_views/sync_dashboard_data_views';
import { startQueryPerformanceTracking } from './performance/query_performance_tracking';
import { startDashboardSearchSessionIntegration } from './search_sessions/start_dashboard_search_session_integration';
import { syncUnifiedSearchState } from './unified_search/sync_dashboard_unified_search_state';
import { InitialComponentState } from '../../../dashboard_api/get_dashboard_api';

/**
 * Builds a new Dashboard from scratch.
 */
export const createDashboard = async (
  creationOptions?: DashboardCreationOptions,
  dashboardCreationStartTime?: number,
  savedObjectId?: string
): Promise<DashboardContainer | undefined> => {
  // --------------------------------------------------------------------------------------
  // Create method which allows work to be done on the dashboard container when it's ready.
  // --------------------------------------------------------------------------------------
  const dashboardContainerReady$ = new Subject<DashboardContainer>();
  const untilDashboardReady = () =>
    new Promise<DashboardContainer>((resolve) => {
      const subscription = dashboardContainerReady$.subscribe((container) => {
        subscription.unsubscribe();
        resolve(container);
      });
    });

  // --------------------------------------------------------------------------------------
  // Lazy load required systems and Dashboard saved object.
  // --------------------------------------------------------------------------------------
  const reduxEmbeddablePackagePromise = lazyLoadReduxToolsPackage();
  const defaultDataViewExistsPromise = dataService.dataViews.defaultDataViewExists();
  const dashboardContentManagementService = getDashboardContentManagementService();
  const dashboardSavedObjectPromise = dashboardContentManagementService.loadDashboardState({
    id: savedObjectId,
  });

  const [reduxEmbeddablePackage, savedObjectResult] = await Promise.all([
    reduxEmbeddablePackagePromise,
    dashboardSavedObjectPromise,
    defaultDataViewExistsPromise /* the result is not used, but the side effect of setting the default data view is needed. */,
  ]);

  // --------------------------------------------------------------------------------------
  // Initialize Dashboard integrations
  // --------------------------------------------------------------------------------------
  const initializeResult = await initializeDashboard({
    loadDashboardReturn: savedObjectResult,
    untilDashboardReady,
    creationOptions,
  });
  if (!initializeResult) return;
  const { input, searchSessionId } = initializeResult;

  // --------------------------------------------------------------------------------------
  // Build the dashboard container.
  // --------------------------------------------------------------------------------------
  const initialComponentState: InitialComponentState = {
    anyMigrationRun: savedObjectResult.anyMigrationRun ?? false,
    isEmbeddedExternally: creationOptions?.isEmbeddedExternally ?? false,
    lastSavedInput: omit(savedObjectResult?.dashboardInput, 'controlGroupInput') ?? {
      ...DEFAULT_DASHBOARD_INPUT,
      id: input.id,
    },
    lastSavedId: savedObjectId,
    managed: savedObjectResult.managed ?? false,
    fullScreenMode: creationOptions?.fullScreenMode ?? false,
  };

  const dashboardContainer = new DashboardContainer(
    input,
    reduxEmbeddablePackage,
    searchSessionId,
    dashboardCreationStartTime,
    undefined,
    creationOptions,
    initialComponentState
  );

  // --------------------------------------------------------------------------------------
  // Start the diffing integration after all other integrations are set up.
  // --------------------------------------------------------------------------------------
  untilDashboardReady().then((container) => {
    startDiffingDashboardState.bind(container)(creationOptions);
  });

  dashboardContainerReady$.next(dashboardContainer);
  return dashboardContainer;
};

/**
 * Initializes a Dashboard and starts all of its integrations
 */
export const initializeDashboard = async ({
  loadDashboardReturn,
  untilDashboardReady,
  creationOptions,
}: {
  loadDashboardReturn: LoadDashboardReturn;
  untilDashboardReady: () => Promise<DashboardContainer>;
  creationOptions?: DashboardCreationOptions;
}) => {
  const {
    queryString,
    filterManager,
    timefilter: { timefilter: timefilterService },
  } = dataService.query;
  const dashboardBackupService = getDashboardBackupService();

  const {
    getInitialInput,
    searchSessionSettings,
    unifiedSearchSettings,
    validateLoadedSavedObject,
    useUnifiedSearchIntegration,
    useSessionStorageIntegration,
  } = creationOptions ?? {};

  // --------------------------------------------------------------------------------------
  // Run validation.
  // --------------------------------------------------------------------------------------
  const validationResult = loadDashboardReturn && validateLoadedSavedObject?.(loadDashboardReturn);
  if (validationResult === 'invalid') {
    // throw error to stop the rest of Dashboard loading and make the factory return an ErrorEmbeddable.
    throw new Error('Dashboard failed saved object result validation');
  } else if (validationResult === 'redirected') {
    return;
  }

  // --------------------------------------------------------------------------------------
  // Combine input from saved object, and session storage
  // --------------------------------------------------------------------------------------
  const dashboardBackupState = dashboardBackupService.getState(loadDashboardReturn.dashboardId);
  const runtimePanelsToRestore: UnsavedPanelState = useSessionStorageIntegration
    ? dashboardBackupState?.panels ?? {}
    : {};

  const sessionStorageInput = ((): Partial<SavedDashboardInput> | undefined => {
    if (!useSessionStorageIntegration) return;
    return dashboardBackupState?.dashboardState;
  })();
  const initialViewMode = (() => {
    if (loadDashboardReturn.managed || !getDashboardCapabilities().showWriteControls)
      return ViewMode.VIEW;
    if (
      loadDashboardReturn.newDashboardCreated ||
      dashboardBackupService.dashboardHasUnsavedEdits(loadDashboardReturn.dashboardId)
    ) {
      return ViewMode.EDIT;
    }

    return dashboardBackupService.getViewMode();
  })();

  const combinedSessionInput: DashboardContainerInput = {
    ...DEFAULT_DASHBOARD_INPUT,
    ...(loadDashboardReturn?.dashboardInput ?? {}),
    ...sessionStorageInput,
  };

  // --------------------------------------------------------------------------------------
  // Combine input with overrides.
  // --------------------------------------------------------------------------------------
  const overrideInput = getInitialInput?.();
  if (overrideInput?.panels) {
    /**
     * react embeddables and legacy embeddables share state very differently, so we need different
     * treatment here. TODO remove this distinction when we remove the legacy embeddable system.
     */
    const overridePanels: DashboardPanelMap = {};

    for (const panel of Object.values(overrideInput?.panels)) {
      if (embeddableService.reactEmbeddableRegistryHasKey(panel.type)) {
        overridePanels[panel.explicitInput.id] = {
          ...panel,

          /**
           * here we need to keep the state of the panel that was already in the Dashboard if one exists.
           * This is because this state will become the "last saved state" for this panel.
           */
          ...(combinedSessionInput.panels[panel.explicitInput.id] ?? []),
        };
        /**
         * We also need to add the state of this react embeddable into the runtime state to be restored.
         */
        runtimePanelsToRestore[panel.explicitInput.id] = panel.explicitInput;
      } else {
        /**
         * if this is a legacy embeddable, the override state needs to completely overwrite the existing
         * state for this panel.
         */
        overridePanels[panel.explicitInput.id] = panel;
      }
    }

    /**
     * If this is a React embeddable, we leave the "panel" state as-is and add this state to the
     * runtime state to be restored on dashboard load.
     */
    overrideInput.panels = overridePanels;
  }
  const combinedOverrideInput: DashboardContainerInput = {
    ...combinedSessionInput,
    ...(initialViewMode ? { viewMode: initialViewMode } : {}),
    ...overrideInput,
  };

  // --------------------------------------------------------------------------------------
  // Combine input from saved object, session storage, & passed input to create initial input.
  // --------------------------------------------------------------------------------------
  const initialDashboardInput: DashboardContainerInput = omit(
    cloneDeep(combinedOverrideInput),
    'controlGroupInput'
  );

  // Back up any view mode passed in explicitly.
  if (overrideInput?.viewMode) {
    dashboardBackupService.storeViewMode(overrideInput?.viewMode);
  }

  initialDashboardInput.executionContext = {
    type: 'dashboard',
    description: initialDashboardInput.title,
  };

  // --------------------------------------------------------------------------------------
  // Track references
  // --------------------------------------------------------------------------------------
  untilDashboardReady().then((dashboard) => {
    dashboard.savedObjectReferences = loadDashboardReturn?.references;
    dashboard.controlGroupInput = loadDashboardReturn?.dashboardInput?.controlGroupInput;
  });

  // --------------------------------------------------------------------------------------
  // Set up unified search integration.
  // --------------------------------------------------------------------------------------
  if (useUnifiedSearchIntegration && unifiedSearchSettings?.kbnUrlStateStorage) {
    const {
      query,
      filters,
      timeRestore,
      timeRange: savedTimeRange,
      refreshInterval: savedRefreshInterval,
    } = initialDashboardInput;
    const { kbnUrlStateStorage } = unifiedSearchSettings;

    // apply filters and query to the query service
    filterManager.setAppFilters(cloneDeep(filters ?? []));
    queryString.setQuery(query ?? queryString.getDefaultQuery());

    /**
     * Get initial time range, and set up dashboard time restore if applicable
     */
    const initialTimeRange: TimeRange = (() => {
      // if there is an explicit time range in the URL it always takes precedence.
      const urlOverrideTimeRange =
        kbnUrlStateStorage.get<GlobalQueryStateFromUrl>(GLOBAL_STATE_STORAGE_KEY)?.time;
      if (urlOverrideTimeRange) return urlOverrideTimeRange;

      // if this Dashboard has timeRestore return the time range that was saved with the dashboard.
      if (timeRestore && savedTimeRange) return savedTimeRange;

      // otherwise fall back to the time range from the timefilterService.
      return timefilterService.getTime();
    })();
    initialDashboardInput.timeRange = initialTimeRange;
    if (timeRestore) {
      if (savedTimeRange) timefilterService.setTime(savedTimeRange);
      if (savedRefreshInterval) timefilterService.setRefreshInterval(savedRefreshInterval);
    }

    // start syncing global query state with the URL.
    const { stop: stopSyncingQueryServiceStateWithUrl } = syncGlobalQueryStateWithUrl(
      dataService.query,
      kbnUrlStateStorage
    );

    untilDashboardReady().then((dashboardContainer) => {
      const stopSyncingUnifiedSearchState =
        syncUnifiedSearchState.bind(dashboardContainer)(kbnUrlStateStorage);
      dashboardContainer.stopSyncingWithUnifiedSearch = () => {
        stopSyncingUnifiedSearchState();
        stopSyncingQueryServiceStateWithUrl();
      };
    });
  }

  // --------------------------------------------------------------------------------------
  // Place the incoming embeddable if there is one
  // --------------------------------------------------------------------------------------
  const incomingEmbeddable = creationOptions?.getIncomingEmbeddable?.();
  if (incomingEmbeddable) {
    const scrolltoIncomingEmbeddable = (container: DashboardContainer, id: string) => {
      container.setScrollToPanelId(id);
      container.setHighlightPanelId(id);
    };

    initialDashboardInput.viewMode = ViewMode.EDIT; // view mode must always be edit to recieve an embeddable.
    if (
      incomingEmbeddable.embeddableId &&
      Boolean(initialDashboardInput.panels[incomingEmbeddable.embeddableId])
    ) {
      // this embeddable already exists, we will update the explicit input.
      const panelToUpdate = initialDashboardInput.panels[incomingEmbeddable.embeddableId];
      const sameType = panelToUpdate.type === incomingEmbeddable.type;

      panelToUpdate.type = incomingEmbeddable.type;
      const nextRuntimeState = {
        // if the incoming panel is the same type as what was there before we can safely spread the old panel's explicit input
        ...(sameType ? panelToUpdate.explicitInput : {}),

        ...incomingEmbeddable.input,
        id: incomingEmbeddable.embeddableId,

        // maintain hide panel titles setting.
        hidePanelTitles: panelToUpdate.explicitInput.hidePanelTitles,
      };
      if (embeddableService.reactEmbeddableRegistryHasKey(incomingEmbeddable.type)) {
        // panelToUpdate.explicitInput = { id: panelToUpdate.explicitInput.id };
        runtimePanelsToRestore[incomingEmbeddable.embeddableId] = nextRuntimeState;
      } else {
        panelToUpdate.explicitInput = nextRuntimeState;
      }

      untilDashboardReady().then((container) =>
        scrolltoIncomingEmbeddable(container, incomingEmbeddable.embeddableId as string)
      );
    } else {
      // otherwise this incoming embeddable is brand new and can be added after the dashboard container is created.

      untilDashboardReady().then(async (container) => {
        const createdEmbeddable = await (async () => {
          // if there is no width or height we can add the panel using the default behaviour.
          if (!incomingEmbeddable.size) {
            return await container.addNewPanel<{ uuid: string }>({
              panelType: incomingEmbeddable.type,
              initialState: incomingEmbeddable.input,
            });
          }

          // if the incoming embeddable has an explicit width or height we add the panel to the grid directly.
          const { width, height } = incomingEmbeddable.size;
          const currentPanels = container.getInput().panels;
          const embeddableId = incomingEmbeddable.embeddableId ?? v4();
          const { newPanelPlacement } = runPanelPlacementStrategy(
            PanelPlacementStrategy.findTopLeftMostOpenSpace,
            {
              width: width ?? DEFAULT_PANEL_WIDTH,
              height: height ?? DEFAULT_PANEL_HEIGHT,
              currentPanels,
            }
          );
          const newPanelState: DashboardPanelState = (() => {
            if (embeddableService.reactEmbeddableRegistryHasKey(incomingEmbeddable.type)) {
              runtimePanelsToRestore[embeddableId] = incomingEmbeddable.input;
              return {
                explicitInput: { id: embeddableId },
                type: incomingEmbeddable.type,
                gridData: {
                  ...newPanelPlacement,
                  i: embeddableId,
                },
              };
            }
            return {
              explicitInput: { ...incomingEmbeddable.input, id: embeddableId },
              type: incomingEmbeddable.type,
              gridData: {
                ...newPanelPlacement,
                i: embeddableId,
              },
            };
          })();
          container.updateInput({
            panels: {
              ...container.getInput().panels,
              [newPanelState.explicitInput.id]: newPanelState,
            },
          });

          return await container.untilEmbeddableLoaded(embeddableId);
        })();
        if (createdEmbeddable) {
          scrolltoIncomingEmbeddable(container, createdEmbeddable.uuid);
        }
      });
    }
  }

  // --------------------------------------------------------------------------------------
  // Set restored runtime state for react embeddables.
  // --------------------------------------------------------------------------------------
  untilDashboardReady().then((dashboardContainer) => {
    if (overrideInput?.controlGroupState) {
      dashboardContainer.setRuntimeStateForChild(
        PANELS_CONTROL_GROUP_KEY,
        overrideInput.controlGroupState
      );
    }

    for (const idWithRuntimeState of Object.keys(runtimePanelsToRestore)) {
      const restoredRuntimeStateForChild = runtimePanelsToRestore[idWithRuntimeState];
      if (!restoredRuntimeStateForChild) continue;
      dashboardContainer.setRuntimeStateForChild(idWithRuntimeState, restoredRuntimeStateForChild);
    }
  });

  // --------------------------------------------------------------------------------------
  // Start the data views integration.
  // --------------------------------------------------------------------------------------
  untilDashboardReady().then((dashboardContainer) => {
    dashboardContainer.integrationSubscriptions.add(
      startSyncingDashboardDataViews.bind(dashboardContainer)()
    );
  });

  // --------------------------------------------------------------------------------------
  // Start performance tracker
  // --------------------------------------------------------------------------------------
  untilDashboardReady().then((dashboardContainer) =>
    dashboardContainer.integrationSubscriptions.add(
      startQueryPerformanceTracking(dashboardContainer)
    )
  );

  // --------------------------------------------------------------------------------------
  // Start animating panel transforms 500 ms after dashboard is created.
  // --------------------------------------------------------------------------------------
  untilDashboardReady().then((dashboard) =>
    setTimeout(() => dashboard.setAnimatePanelTransforms(true), 500)
  );

  // --------------------------------------------------------------------------------------
  // Set up search sessions integration.
  // --------------------------------------------------------------------------------------
  let initialSearchSessionId;
  if (searchSessionSettings) {
    const { sessionIdToRestore } = searchSessionSettings;

    // if this incoming embeddable has a session, continue it.
    if (incomingEmbeddable?.searchSessionId) {
      dataService.search.session.continue(incomingEmbeddable.searchSessionId);
    }
    if (sessionIdToRestore) {
      dataService.search.session.restore(sessionIdToRestore);
    }
    const existingSession = dataService.search.session.getSessionId();

    initialSearchSessionId =
      sessionIdToRestore ??
      (existingSession && incomingEmbeddable
        ? existingSession
        : dataService.search.session.start());

    untilDashboardReady().then(async (container) => {
      await container.untilContainerInitialized();
      startDashboardSearchSessionIntegration.bind(container)(
        creationOptions?.searchSessionSettings
      );
    });
  }

  if (loadDashboardReturn.dashboardId && !incomingEmbeddable) {
    // We count a new view every time a user opens a dashboard, both in view or edit mode
    // We don't count views when a user is editing a dashboard and is returning from an editor after saving
    // however, there is an edge case that we now count a new view when a user is editing a dashboard and is returning from an editor by canceling
    // TODO: this should be revisited by making embeddable transfer support canceling logic https://github.com/elastic/kibana/issues/190485
    const contentInsightsClient = new ContentInsightsClient(
      { http: coreServices.http },
      { domainId: 'dashboard' }
    );
    contentInsightsClient.track(loadDashboardReturn.dashboardId, 'viewed');
  }

  return { input: initialDashboardInput, searchSessionId: initialSearchSessionId };
};
