/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
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

import { DashboardContainerInput } from '../../../../common';
import { DashboardContainer } from '../dashboard_container';
import { pluginServices } from '../../../services/plugin_services';
import { DashboardCreationOptions } from '../dashboard_container_factory';
import { startSyncingDashboardDataViews } from './data_views/sync_dashboard_data_views';
import { LoadDashboardReturn } from '../../../services/dashboard_content_management/types';
import { syncUnifiedSearchState } from './unified_search/sync_dashboard_unified_search_state';
import { DEFAULT_DASHBOARD_INPUT, GLOBAL_STATE_STORAGE_KEY } from '../../../dashboard_constants';
import { startSyncingDashboardControlGroup } from './controls/dashboard_control_group_integration';
import { startDashboardSearchSessionIntegration } from './search_sessions/start_dashboard_search_session_integration';

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
  const defaultDataViewAssignmentPromise = dataViews.getDefaultDataView();
  const dashboardSavedObjectPromise = loadDashboardState({ id: savedObjectId });

  const [reduxEmbeddablePackage, savedObjectResult, defaultDataView] = await Promise.all([
    reduxEmbeddablePackagePromise,
    dashboardSavedObjectPromise,
    defaultDataViewAssignmentPromise,
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
  const dashboardContainer = new DashboardContainer(
    input,
    reduxEmbeddablePackage,
    searchSessionId,
    savedObjectResult?.dashboardInput,
    savedObjectResult.anyMigrationRun,
    dashboardCreationStartTime,
    undefined,
    creationOptions,
    savedObjectId
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
    dashboardSessionStorage,
    embeddable: { getEmbeddableFactory },
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
  // Gather input from session storage if integration is used.
  // --------------------------------------------------------------------------------------
  const sessionStorageInput = ((): Partial<DashboardContainerInput> | undefined => {
    if (!useSessionStorageIntegration) return;
    return dashboardSessionStorage.getState(loadDashboardReturn.dashboardId);
  })();

  // --------------------------------------------------------------------------------------
  // Combine input from saved object, session storage, & passed input to create initial input.
  // --------------------------------------------------------------------------------------
  const overrideInput = getInitialInput?.();
  const initialInput: DashboardContainerInput = cloneDeep({
    ...DEFAULT_DASHBOARD_INPUT,
    ...(loadDashboardReturn?.dashboardInput ?? {}),
    ...sessionStorageInput,
    ...overrideInput,
  });

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
      // otherwise this incoming embeddable is brand new and can be added via the default method after the dashboard container is created.
      untilDashboardReady().then(async (container) => {
        const embeddable = await container.addNewEmbeddable(
          incomingEmbeddable.type,
          incomingEmbeddable.input
        );
        scrolltoIncomingEmbeddable(container, embeddable.id);
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
