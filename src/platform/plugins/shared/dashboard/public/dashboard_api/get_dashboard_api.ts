/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EmbeddablePackageState } from '@kbn/embeddable-plugin/public';
import { BehaviorSubject, Subject } from 'rxjs';
import { v4 } from 'uuid';

import { DASHBOARD_APP_ID } from '../../common/page_bundle_constants';
import type { DashboardState } from '../../common/types';
import { initializeAccessControlManager } from './access_control_manager';
import { initializeDataLoadingManager } from './data_loading_manager';
import { initializeDataViewsManager } from './data_views_manager';
import { initializeESQLVariablesManager } from './esql_variables_manager';
import { initializeFiltersManager } from './filters_manager';
import { getLastSavedState } from './default_dashboard_state';
import { initializeLayoutManager } from './layout_manager';
import { openSaveModal } from './save_modal/open_save_modal';
import { saveDashboard } from './save_modal/save_dashboard';
import { initializeSearchSessionManager } from './search_sessions/search_session_manager';
import { initializeSettingsManager } from './settings_manager';
import { initializeTimesliceManager } from './timeslice_manager';
import { initializeTrackContentfulRender } from './track_contentful_render';
import { initializeTrackOverlay } from './track_overlay';
import { initializeTrackPanel } from './track_panel';
import type {
  DashboardApi,
  DashboardCreationOptions,
  DashboardInternalApi,
  DashboardUser,
} from './types';
import { DASHBOARD_API_TYPE } from './types';
import { initializeUnifiedSearchManager } from './unified_search_manager';
import { initializeProjectRoutingManager } from './project_routing_manager';
import { initializeUnsavedChangesManager } from './unsaved_changes_manager';
import { initializeViewModeManager } from './view_mode_manager';
import type { DashboardReadResponseBody } from '../../server';
import { initializePauseFetchManager } from './pause_fetch_manager';
import { initializeRelatedPanelsManager } from './related_panels_manager';

export function getDashboardApi({
  creationOptions,
  incomingEmbeddables,
  initialState,
  readResult,
  savedObjectId,
  user,
  isAccessControlEnabled,
}: {
  creationOptions?: DashboardCreationOptions;
  incomingEmbeddables: EmbeddablePackageState[] | undefined;
  initialState: DashboardState;
  readResult?: DashboardReadResponseBody;
  savedObjectId?: string;
  user?: DashboardUser;
  isAccessControlEnabled?: boolean;
}) {
  const fullScreenMode$ = new BehaviorSubject(creationOptions?.fullScreenMode ?? false);
  const isManaged = readResult?.meta.managed ?? false;
  const savedObjectId$ = new BehaviorSubject<string | undefined>(savedObjectId);
  const dashboardContainerRef$ = new BehaviorSubject<HTMLElement | null>(null);

  const accessControlManager = initializeAccessControlManager(readResult, savedObjectId$);

  const viewModeManager = initializeViewModeManager({
    incomingEmbeddables,
    isManaged,
    savedObjectId,
    accessControl: {
      accessMode: readResult?.data?.access_control?.access_mode,
      owner: readResult?.data?.access_control?.owner,
    },
    createdBy: readResult?.meta?.created_by,
    user,
  });
  const trackPanel = initializeTrackPanel(async (id: string) => {
    await layoutManager.api.getChildApi(id);
  }, dashboardContainerRef$);

  const layoutManager = initializeLayoutManager(
    viewModeManager,
    incomingEmbeddables,
    initialState.panels,
    initialState.pinned_panels,
    trackPanel
  );

  const dataLoadingManager = initializeDataLoadingManager(layoutManager.api.children$);
  const dataViewsManager = initializeDataViewsManager(layoutManager.api.children$);
  const settingsManager = initializeSettingsManager(initialState);

  const forcePublishOnReset$ = new Subject<void>();

  const esqlVariablesManager = initializeESQLVariablesManager(
    layoutManager.api.children$,
    settingsManager,
    forcePublishOnReset$
  );
  const timesliceManager = initializeTimesliceManager(
    layoutManager.api.children$,
    settingsManager,
    forcePublishOnReset$
  );

  const unifiedSearchManager = initializeUnifiedSearchManager(
    initialState,
    settingsManager.api.timeRestore$,
    dataLoadingManager.internalApi.waitForPanelsToLoad$,
    () => unsavedChangesManager.internalApi.getLastSavedState(),
    creationOptions
  );
  const filtersManager = initializeFiltersManager(
    unifiedSearchManager,
    layoutManager,
    settingsManager,
    forcePublishOnReset$
  );
  const projectRoutingManager = initializeProjectRoutingManager(
    initialState,
    settingsManager.api.projectRoutingRestore$
  );

  const unsavedChangesManager = initializeUnsavedChangesManager({
    viewMode$: viewModeManager.api.viewMode$,
    storeUnsavedChanges: creationOptions?.useSessionStorageIntegration,
    lastSavedState: getLastSavedState(readResult),
    layoutManager,
    savedObjectId$,
    settingsManager,
    unifiedSearchManager,
    projectRoutingManager,
    forcePublishOnReset$,
  });

  function getState() {
    const { panels, pinned_panels } = layoutManager.internalApi.serializeLayout();
    const unifiedSearchState = unifiedSearchManager.internalApi.getState();
    const projectRoutingState = projectRoutingManager?.internalApi.getState();
    return {
      ...settingsManager.internalApi.serializeSettings(),
      ...unifiedSearchState,
      ...projectRoutingState,
      panels,
      pinned_panels,
    } satisfies DashboardState;
  }

  const trackOverlayApi = initializeTrackOverlay(trackPanel.setFocusedPanelId);

  const pauseFetchManager = initializePauseFetchManager(filtersManager);

  const relatedPanelsManager = initializeRelatedPanelsManager(trackPanel, layoutManager);

  const dashboardApi = {
    ...viewModeManager.api,
    ...dataLoadingManager.api,
    ...dataViewsManager.api,
    ...layoutManager.api,
    ...settingsManager.api,
    ...filtersManager.api,
    ...trackPanel,
    ...unifiedSearchManager.api,
    ...unsavedChangesManager.api,
    ...projectRoutingManager?.api,
    ...trackOverlayApi,
    esqlVariables$: esqlVariablesManager.api.publishedEsqlVariables$,
    ...timesliceManager.api,
    ...pauseFetchManager.api,
    ...initializeTrackContentfulRender(),
    executionContext: {
      type: 'dashboard',
      description: settingsManager.api.title$.value,
    },
    fullScreenMode$,
    getAppContext: () => {
      const embeddableAppContext = creationOptions?.getEmbeddableAppContext?.(savedObjectId$.value);
      return {
        ...embeddableAppContext,
        currentAppId: embeddableAppContext?.currentAppId ?? DASHBOARD_APP_ID,
      };
    },
    isEmbeddedExternally: Boolean(creationOptions?.isEmbeddedExternally),
    isManaged,
    getSerializedState: () => ({
      attributes: getState(),
    }),
    runInteractiveSave: async () => {
      trackOverlayApi.clearOverlays();

      const {
        description,
        tags,
        time_restore: timeRestore,
        project_routing_restore: projectRoutingRestore,
        title,
      } = settingsManager.api.getSettings();
      const saveResult = await openSaveModal({
        description,
        isManaged,
        lastSavedId: savedObjectId$.value,
        serializeState: getState,
        setTimeRestore: (newTimeRestore: boolean) =>
          settingsManager.api.setSettings({ time_restore: newTimeRestore }),
        setProjectRoutingRestore: (newProjectRoutingRestore: boolean) =>
          settingsManager.api.setSettings({ project_routing_restore: newProjectRoutingRestore }),
        tags,
        timeRestore,
        projectRoutingRestore,
        title,
        viewMode: viewModeManager.api.viewMode$.value,
        accessControl: accessControlManager.api.accessControl$.value,
      });

      if (!saveResult || saveResult.error) {
        return;
      }

      if (saveResult) {
        unsavedChangesManager.internalApi.onSave(saveResult.savedState);
        const settings = settingsManager.api.getSettings();
        settingsManager.api.setSettings({
          ...settings,
          hide_panel_titles: settings.hide_panel_titles ?? false,
          description: saveResult.savedState.description,
          tags: saveResult.savedState.tags,
          title: saveResult.savedState.title,
        });
        savedObjectId$.next(saveResult.id);
      }

      return saveResult;
    },
    runQuickSave: async () => {
      if (isManaged) return;
      const dashboardState = getState();
      const saveResult = await saveDashboard({
        dashboardState,
        saveOptions: {},
        lastSavedId: savedObjectId$.value,
        accessMode: accessControlManager.api.accessControl$.value?.accessMode,
      });

      if (saveResult?.error) return;
      unsavedChangesManager.internalApi.onSave(dashboardState);

      return;
    },
    savedObjectId$,
    setFullScreenMode: (fullScreenMode: boolean) => fullScreenMode$.next(fullScreenMode),
    getSerializedStateForChild: (childId: string) =>
      layoutManager.internalApi.getSerializedStateForPanel(childId),
    setSavedObjectId: (id: string | undefined) => savedObjectId$.next(id),
    type: DASHBOARD_API_TYPE as 'dashboard',
    uuid: v4(),
    getPassThroughContext: () => creationOptions?.getPassThroughContext?.(),
    createdBy: readResult?.meta?.created_by,
    user,
    // TODO: accessControl$ and changeAccessMode should be moved to internalApi
    accessControl$: accessControlManager.api.accessControl$,
    changeAccessMode: accessControlManager.api.changeAccessMode,
    isAccessControlEnabled: Boolean(isAccessControlEnabled),
  } as Omit<DashboardApi, 'searchSessionId$'>;

  const internalApi: DashboardInternalApi = {
    ...layoutManager.internalApi,
    ...unifiedSearchManager.internalApi,
    ...esqlVariablesManager.api,
    ...relatedPanelsManager.api,
    dashboardContainerRef$,
    setDashboardContainerRef: (ref: HTMLElement | null) => dashboardContainerRef$.next(ref),
  };

  const searchSessionManager = initializeSearchSessionManager(
    creationOptions?.searchSessionSettings,
    incomingEmbeddables,
    dashboardApi,
    internalApi
  );

  return {
    api: {
      ...dashboardApi,
      ...searchSessionManager.api,
    } as DashboardApi,
    internalApi,
    cleanup: () => {
      dataLoadingManager.cleanup();
      dataViewsManager.cleanup();
      searchSessionManager.cleanup();
      unifiedSearchManager.cleanup();
      unsavedChangesManager.cleanup();
      layoutManager.cleanup();
      esqlVariablesManager.cleanup();
      timesliceManager.cleanup();
      projectRoutingManager?.cleanup();
      pauseFetchManager.cleanup();
    },
  };
}
