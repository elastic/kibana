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
import { syncGlobalQueryStateWithUrl } from '@kbn/data-plugin/public';
import { lazyLoadReduxEmbeddablePackage } from '@kbn/presentation-util-plugin/public';
import { type ControlGroupContainer, ControlGroupOutput } from '@kbn/controls-plugin/public';
import { ErrorEmbeddable, isErrorEmbeddable, ViewMode } from '@kbn/embeddable-plugin/public';

import { DashboardContainerInput } from '../../../common';
import { DashboardContainer } from './dashboard_container';
import { pluginServices } from '../../services/plugin_services';
import { DashboardCreationOptions } from './dashboard_container_factory';
import { startSyncingDashboardControlGroup } from './integrations/controls/dashboard_control_group_integration';
import { syncUnifiedSearchState } from './integrations/unified_search/sync_dashboard_unified_search_state';

/**
 *
 * @param creationOptions
 */
export const buildDashboard = async (
  creationOptions?: DashboardCreationOptions,
  dashboardCreationStartTime?: number,
  savedObjectId?: string
): Promise<DashboardContainer | ErrorEmbeddable> => {
  // --------------------------------------------------------------------------------------
  // Unpack services & Options
  // --------------------------------------------------------------------------------------
  const {
    dashboardSessionStorage,
    embeddable: { getEmbeddableFactory },
    data: { dataViews, query: queryService },
    dashboardSavedObject: { loadDashboardStateFromSavedObject },
  } = pluginServices.getServices();

  const {
    queryString,
    filterManager,
    timefilter: { timefilter: timefilterService },
  } = queryService;

  const {
    unifiedSearchSettings,
    validateLoadedSavedObject,
    useUnifiedSearchIntegration,
    initialInput: overrideInput,
    useSessionStorageIntegration,
  } = creationOptions ?? {};

  // --------------------------------------------------------------------------------------
  // Lazy load required systems and Dashboard saved object
  // --------------------------------------------------------------------------------------

  const reduxEmbeddablePackagePromise = lazyLoadReduxEmbeddablePackage();
  const defaultDataViewAssignmentPromise = dataViews.getDefaultDataView();
  const dashboardSavedObjectPromise = savedObjectId
    ? loadDashboardStateFromSavedObject({ id: savedObjectId })
    : Promise.resolve(undefined);

  const [reduxEmbeddablePackage, savedObjectResult, defaultDataView] = await Promise.all([
    reduxEmbeddablePackagePromise,
    dashboardSavedObjectPromise,
    defaultDataViewAssignmentPromise,
  ]);

  // --------------------------------------------------------------------------------------
  // Validations
  // --------------------------------------------------------------------------------------
  if (!defaultDataView) {
    throw new Error('Dashboard requires at least one data view before it can be initialized.');
  }

  if (
    savedObjectResult &&
    validateLoadedSavedObject &&
    !validateLoadedSavedObject(savedObjectResult)
  ) {
    throw new Error('Dashboard failed saved object result validation');
  }

  // --------------------------------------------------------------------------------------
  // Gather input from session storage if integration is used
  // --------------------------------------------------------------------------------------
  const sessionStorageInput = ((): Partial<DashboardContainerInput> | undefined => {
    if (!useSessionStorageIntegration) return;
    return dashboardSessionStorage.getState(savedObjectId);
  })();

  // --------------------------------------------------------------------------------------
  // Combine input from saved object, session storage, & passed input.
  // --------------------------------------------------------------------------------------
  const initialInput: DashboardContainerInput = cloneDeep({
    ...(savedObjectResult?.dashboardInput ?? {}),
    ...sessionStorageInput,
    ...overrideInput,
  });

  initialInput.executionContext = {
    type: 'dashboard',
    description: initialInput.title,
  };

  // --------------------------------------------------------------------------------------
  // Method which allows work to be done on the dashboard container when it's ready
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
  // Set up unified search integration
  // --------------------------------------------------------------------------------------
  if (useUnifiedSearchIntegration && unifiedSearchSettings?.kbnUrlStateStorage) {
    const { filters, query, timeRestore, timeRange, refreshInterval } = initialInput;
    const { kbnUrlStateStorage } = unifiedSearchSettings;

    // apply filters and query to the query service
    filterManager.setAppFilters(cloneDeep(filters ?? []));
    queryString.setQuery(query ?? queryString.getDefaultQuery());

    /**
     * If a global time range is not set explicitly and the time range was saved with the dashboard, apply
     * time range and refresh interval to the query service.
     */
    if (timeRestore) {
      if (timeRange) timefilterService.setTime(timeRange);
      if (refreshInterval) timefilterService.setRefreshInterval(refreshInterval);
    }
    const { stop: stopSyncingQueryServiceStateWithUrl } = syncGlobalQueryStateWithUrl(
      queryService,
      kbnUrlStateStorage
    );

    const initialTimeRange = initialInput.timeRestore ? undefined : timefilterService.getTime();
    untilDashboardReady().then((dashboardContainer) => {
      const stopSyncingUnifiedSearchState =
        syncUnifiedSearchState.bind(dashboardContainer)(kbnUrlStateStorage);
      //   setCleanupFunction(() => {
      //     stopSyncingQueryServiceStateWithUrl?.();
      //     stopSyncingUnifiedSearchState?.();
      //   });
    });
    if (initialTimeRange) initialInput.timeRange = initialTimeRange;
  }

  // --------------------------------------------------------------------------------------
  // Place the incoming embeddable if there is one
  // --------------------------------------------------------------------------------------
  const incomingEmbeddable = creationOptions?.incomingEmbeddable;
  if (incomingEmbeddable) {
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
    } else {
      // otherwise this incoming embeddable is brand new and can be added via the default method after the dashboard container is created.
      untilDashboardReady().then((container) =>
        container.addNewEmbeddable(incomingEmbeddable.type, incomingEmbeddable.input)
      );
    }
  }

  // --------------------------------------------------------------------------------------
  // Start the control group integration
  // --------------------------------------------------------------------------------------
  const controlsGroupFactory = getEmbeddableFactory<
    ControlGroupInput,
    ControlGroupOutput,
    ControlGroupContainer
  >(CONTROL_GROUP_TYPE);
  const { filters, query, timeRange, viewMode, controlGroupInput, id } = initialInput;
  const controlGroup = await controlsGroupFactory?.create({
    id: `control_group_${id ?? 'new_dashboard'}`,
    ...getDefaultControlGroupInput(),
    ...pickBy(controlGroupInput, identity), // undefined keys in initialInput should not overwrite defaults
    timeRange,
    viewMode,
    filters,
    query,
  });
  if (!controlGroup || isErrorEmbeddable(controlGroup)) {
    throw new Error('Error in control group startup');
  }

  untilDashboardReady().then((dashboardContainer) => {
    dashboardContainer.controlGroup = controlGroup;
    startSyncingDashboardControlGroup.bind(dashboardContainer)();
  });
  await controlGroup.untilInitialized();

  const dashboardContainer = new DashboardContainer(
    initialInput,
    reduxEmbeddablePackage,
    savedObjectResult?.dashboardInput,
    dashboardCreationStartTime,
    undefined,
    creationOptions
  );
  dashboardContainerReady$.next(dashboardContainer);
  return dashboardContainer;
};
