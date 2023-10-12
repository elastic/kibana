/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { v4 } from 'uuid';
import { Subject } from 'rxjs';
import { cloneDeep, identity, pickBy } from 'lodash';

import {
  ControlGroupInput,
  CONTROL_GROUP_TYPE,
  getDefaultControlGroupInput,
} from '@kbn/controls-plugin/common';
import { TimeRange } from '@kbn/es-query';
import { isErrorEmbeddable, ViewMode } from '@kbn/embeddable-plugin/public';
import { lazyLoadReduxToolsPackage } from '@kbn/presentation-util-plugin/public';
import { type ControlGroupContainer, ControlGroupOutput } from '@kbn/controls-plugin/public';
import { GlobalQueryStateFromUrl, syncGlobalQueryStateWithUrl } from '@kbn/data-plugin/public';

import { DashboardContainer } from '../dashboard_container';
import { pluginServices } from '../../../services/plugin_services';
import { DashboardCreationOptions } from '../dashboard_container_factory';
import { DashboardContainerInput, DashboardPanelState } from '../../../../common';
import { startSyncingDashboardDataViews } from './data_views/sync_dashboard_data_views';
import { LoadDashboardReturn } from '../../../services/dashboard_content_management/types';
import { syncUnifiedSearchState } from './unified_search/sync_dashboard_unified_search_state';
import { panelPlacementStrategies } from '../../component/panel_placement/place_new_panel_strategies';
import {
  DEFAULT_DASHBOARD_INPUT,
  DEFAULT_PANEL_HEIGHT,
  DEFAULT_PANEL_WIDTH,
  GLOBAL_STATE_STORAGE_KEY,
} from '../../../dashboard_constants';
import { startSyncingDashboardControlGroup } from './controls/dashboard_control_group_integration';
import { startDashboardSearchSessionIntegration } from './search_sessions/start_dashboard_search_session_integration';
import { DashboardPublicState } from '../../types';

/**
 * Builds a new Dashboard from scratch.
 */
export const createDashboard = async (
  creationOptions?: DashboardCreationOptions,
  dashboardCreationStartTime?: number,
  savedObjectId?: string
): Promise<DashboardContainer | undefined> => {
  const {
    data: { dataViews },
    dashboardContentManagement: { loadDashboardState },
  } = pluginServices.getServices();

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
  const defaultDataViewExistsPromise = dataViews.defaultDataViewExists();
  const dashboardSavedObjectPromise = loadDashboardState({ id: savedObjectId });

  const [reduxEmbeddablePackage, savedObjectResult, defaultDataView] = await Promise.all([
    reduxEmbeddablePackagePromise,
    dashboardSavedObjectPromise,
    defaultDataViewExistsPromise,
  ]);

  if (!defaultDataView) {
    throw new Error('Dashboard requires at least one data view before it can be initialized.');
  }

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
  // Build and return the dashboard container.
  // --------------------------------------------------------------------------------------
  const initialComponentState: DashboardPublicState = {
    lastSavedInput: savedObjectResult?.dashboardInput ?? {
      ...DEFAULT_DASHBOARD_INPUT,
      id: input.id,
    },
    hasRunClientsideMigrations: savedObjectResult.anyMigrationRun,
    isEmbeddedExternally: creationOptions?.isEmbeddedExternally,
    animatePanelTransforms: false, // set panel transforms to false initially to avoid panels animating on initial render.
    hasUnsavedChanges: false, // if there is initial unsaved changes, the initial diff will catch them.
    managed: savedObjectResult.managed,
    lastSavedId: savedObjectId,
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
  controlGroup,
}: {
  loadDashboardReturn: LoadDashboardReturn;
  untilDashboardReady: () => Promise<DashboardContainer>;
  creationOptions?: DashboardCreationOptions;
  controlGroup?: ControlGroupContainer;
}) => {
  const {
    dashboardBackup,
    embeddable: { getEmbeddableFactory },
    dashboardCapabilities: { showWriteControls },
    data: {
      query: queryService,
      search: { session },
    },
  } = pluginServices.getServices();
  const {
    queryString,
    filterManager,
    timefilter: { timefilter: timefilterService },
  } = queryService;

  const {
    getInitialInput,
    searchSessionSettings,
    unifiedSearchSettings,
    validateLoadedSavedObject,
    useControlGroupIntegration,
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
  // Gather input from session storage and local storage if integration is used.
  // --------------------------------------------------------------------------------------
  const sessionStorageInput = ((): Partial<DashboardContainerInput> | undefined => {
    if (!useSessionStorageIntegration) return;
    return dashboardBackup.getState(loadDashboardReturn.dashboardId);
  })();

  // --------------------------------------------------------------------------------------
  // Combine input from saved object, session storage, & passed input to create initial input.
  // --------------------------------------------------------------------------------------
  const initialViewMode = (() => {
    if (loadDashboardReturn.managed || !showWriteControls) return ViewMode.VIEW;
    if (
      loadDashboardReturn.newDashboardCreated ||
      dashboardBackup.dashboardHasUnsavedEdits(loadDashboardReturn.dashboardId)
    ) {
      return ViewMode.EDIT;
    }

    return dashboardBackup.getViewMode();
  })();

  const overrideInput = getInitialInput?.();
  const initialInput: DashboardContainerInput = cloneDeep({
    ...DEFAULT_DASHBOARD_INPUT,
    ...(loadDashboardReturn?.dashboardInput ?? {}),
    ...sessionStorageInput,

    ...(initialViewMode ? { viewMode: initialViewMode } : {}),
    ...overrideInput,
  });

  // Back up any view mode passed in explicitly.
  if (overrideInput?.viewMode) {
    dashboardBackup.storeViewMode(overrideInput?.viewMode);
  }

  initialInput.executionContext = {
    type: 'dashboard',
    description: initialInput.title,
  };

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
    } = initialInput;
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
    initialInput.timeRange = initialTimeRange;
    if (timeRestore) {
      if (savedTimeRange) timefilterService.setTime(savedTimeRange);
      if (savedRefreshInterval) timefilterService.setRefreshInterval(savedRefreshInterval);
    }

    // start syncing global query state with the URL.
    const { stop: stopSyncingQueryServiceStateWithUrl } = syncGlobalQueryStateWithUrl(
      queryService,
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

    initialInput.viewMode = ViewMode.EDIT; // view mode must always be edit to recieve an embeddable.
    if (
      incomingEmbeddable.embeddableId &&
      Boolean(initialInput.panels[incomingEmbeddable.embeddableId])
    ) {
      // this embeddable already exists, we will update the explicit input.
      const panelToUpdate = initialInput.panels[incomingEmbeddable.embeddableId];
      const sameType = panelToUpdate.type === incomingEmbeddable.type;

      panelToUpdate.type = incomingEmbeddable.type;
      panelToUpdate.explicitInput = {
        // if the incoming panel is the same type as what was there before we can safely spread the old panel's explicit input
        ...(sameType ? panelToUpdate.explicitInput : {}),

        ...incomingEmbeddable.input,
        id: incomingEmbeddable.embeddableId,

        // maintain hide panel titles setting.
        hidePanelTitles: panelToUpdate.explicitInput.hidePanelTitles,
      };
      untilDashboardReady().then((container) =>
        scrolltoIncomingEmbeddable(container, incomingEmbeddable.embeddableId as string)
      );
    } else {
      // otherwise this incoming embeddable is brand new and can be added after the dashboard container is created.

      untilDashboardReady().then(async (container) => {
        const createdEmbeddable = await (async () => {
          // if there is no width or height we can add the panel using the default behaviour.
          if (!incomingEmbeddable.size) {
            return await container.addNewEmbeddable(
              incomingEmbeddable.type,
              incomingEmbeddable.input
            );
          }

          // if the incoming embeddable has an explicit width or height we add the panel to the grid directly.
          const { width, height } = incomingEmbeddable.size;
          const currentPanels = container.getInput().panels;
          const embeddableId = incomingEmbeddable.embeddableId ?? v4();
          const { findTopLeftMostOpenSpace } = panelPlacementStrategies;
          const { newPanelPlacement } = findTopLeftMostOpenSpace({
            width: width ?? DEFAULT_PANEL_WIDTH,
            height: height ?? DEFAULT_PANEL_HEIGHT,
            currentPanels,
          });
          const newPanelState: DashboardPanelState = {
            explicitInput: { ...incomingEmbeddable.input, id: embeddableId },
            type: incomingEmbeddable.type,
            gridData: {
              ...newPanelPlacement,
              i: embeddableId,
            },
          };
          container.updateInput({
            panels: {
              ...container.getInput().panels,
              [newPanelState.explicitInput.id]: newPanelState,
            },
          });

          return await container.untilEmbeddableLoaded(embeddableId);
        })();
        scrolltoIncomingEmbeddable(container, createdEmbeddable.id);
      });
    }
  }

  // --------------------------------------------------------------------------------------
  // Set up search sessions integration.
  // --------------------------------------------------------------------------------------
  let initialSearchSessionId;
  if (searchSessionSettings) {
    const { sessionIdToRestore } = searchSessionSettings;

    // if this incoming embeddable has a session, continue it.
    if (incomingEmbeddable?.searchSessionId) {
      session.continue(incomingEmbeddable.searchSessionId);
    }
    if (sessionIdToRestore) {
      session.restore(sessionIdToRestore);
    }
    const existingSession = session.getSessionId();

    initialSearchSessionId =
      sessionIdToRestore ??
      (existingSession && incomingEmbeddable ? existingSession : session.start());

    untilDashboardReady().then((container) => {
      startDashboardSearchSessionIntegration.bind(container)(
        creationOptions?.searchSessionSettings
      );
    });
  }

  // --------------------------------------------------------------------------------------
  // Start the control group integration.
  // --------------------------------------------------------------------------------------
  if (useControlGroupIntegration) {
    const controlsGroupFactory = getEmbeddableFactory<
      ControlGroupInput,
      ControlGroupOutput,
      ControlGroupContainer
    >(CONTROL_GROUP_TYPE);
    const { filters, query, timeRange, viewMode, controlGroupInput, id } = initialInput;
    const fullControlGroupInput = {
      id: `control_group_${id ?? 'new_dashboard'}`,
      ...getDefaultControlGroupInput(),
      ...pickBy(controlGroupInput, identity), // undefined keys in initialInput should not overwrite defaults
      timeRange,
      viewMode,
      filters,
      query,
    };
    if (controlGroup) {
      controlGroup.updateInputAndReinitialize(fullControlGroupInput);
    } else {
      const newControlGroup = await controlsGroupFactory?.create(fullControlGroupInput);
      if (!newControlGroup || isErrorEmbeddable(newControlGroup)) {
        throw new Error('Error in control group startup');
      }
      controlGroup = newControlGroup;
    }

    untilDashboardReady().then((dashboardContainer) => {
      dashboardContainer.controlGroup = controlGroup;
      startSyncingDashboardControlGroup.bind(dashboardContainer)();
    });
    await controlGroup.untilInitialized();
  }

  // --------------------------------------------------------------------------------------
  // Start the data views integration.
  // --------------------------------------------------------------------------------------
  untilDashboardReady().then((dashboardContainer) => {
    dashboardContainer.integrationSubscriptions.add(
      startSyncingDashboardDataViews.bind(dashboardContainer)()
    );
  });

  // --------------------------------------------------------------------------------------
  // Start animating panel transforms 500 ms after dashboard is created.
  // --------------------------------------------------------------------------------------
  untilDashboardReady().then((dashboard) =>
    setTimeout(() => dashboard.dispatch.setAnimatePanelTransforms(true), 500)
  );

  return { input: initialInput, searchSessionId: initialSearchSessionId };
};
