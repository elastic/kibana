/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Reference } from '@kbn/content-management-utils';
import type { EmbeddablePackageState } from '@kbn/embeddable-plugin/public';
import { BehaviorSubject } from 'rxjs';
import { v4 } from 'uuid';
import { getReferencesForPanelId } from '../../common';

import { DASHBOARD_APP_ID } from '../../common/constants';
import type { DashboardState } from '../../common/types';
import type { DashboardAPIGetOut } from '../../server/content_management';
import { initializeDataLoadingManager } from './data_loading_manager';
import { initializeDataViewsManager } from './data_views_manager';
import { DEFAULT_DASHBOARD_STATE } from './default_dashboard_state';
import { initializeESQLVariablesManager } from './esql_variables_manager';
import { initializeFiltersManager } from './filters_manager';
import { initializeLayoutManager } from './layout_manager';
import { openSaveModal } from './save_modal/open_save_modal';
import { saveDashboard } from './save_modal/save_dashboard';
import { initializeSearchSessionManager } from './search_sessions/search_session_manager';
import { initializeSettingsManager } from './settings_manager';
import { initializeTimesliceManager } from './timeslice_manager';
import { initializeTrackContentfulRender } from './track_contentful_render';
import { initializeTrackOverlay } from './track_overlay';
import { initializeTrackPanel } from './track_panel';
import type { DashboardApi, DashboardCreationOptions, DashboardInternalApi } from './types';
import { DASHBOARD_API_TYPE } from './types';
import { initializeUnifiedSearchManager } from './unified_search_manager';
import { initializeUnsavedChangesManager } from './unsaved_changes_manager';
import { initializeViewModeManager } from './view_mode_manager';

export function getDashboardApi({
  creationOptions,
  incomingEmbeddables,
  initialState,
  savedObjectResult,
  savedObjectId,
}: {
  creationOptions?: DashboardCreationOptions;
  incomingEmbeddables?: EmbeddablePackageState[] | undefined;
  initialState: DashboardState;
  savedObjectResult?: DashboardAPIGetOut;
  savedObjectId?: string;
}) {
  const fullScreenMode$ = new BehaviorSubject(creationOptions?.fullScreenMode ?? false);
  const isManaged = savedObjectResult?.meta.managed ?? false;
  const savedObjectId$ = new BehaviorSubject<string | undefined>(savedObjectId);
  const dashboardContainerRef$ = new BehaviorSubject<HTMLElement | null>(null);

  const viewModeManager = initializeViewModeManager({
    incomingEmbeddables,
    isManaged,
    savedObjectId,
  });
  const trackPanel = initializeTrackPanel(async (id: string) => {
    await layoutManager.api.getChildApi(id);
  }, dashboardContainerRef$);

  const references$ = new BehaviorSubject<Reference[] | undefined>(initialState.references);
  const getReferences = (id: string) => {
    return getReferencesForPanelId(id, references$.value ?? []);
  };

  // TODO: Handle incoming sticky embeddables
  // const incomingControlGroup = incomingEmbeddables?.find(
  //   (embeddable) => embeddable.type === CONTROLS_GROUP_TYPE
  // );
  const restEmbeddables = incomingEmbeddables;

  const layoutManager = initializeLayoutManager(
    restEmbeddables,
    initialState.panels,
    initialState.controlGroupInput,
    trackPanel,
    getReferences
  );
  // const mergedControlGroupState = mergeControlGroupStates(
  //   initialState.controlGroupInput,
  //   incomingControlGroup
  // );

  const dataLoadingManager = initializeDataLoadingManager(layoutManager.api.children$);
  const dataViewsManager = initializeDataViewsManager(layoutManager.api.children$);
  const settingsManager = initializeSettingsManager(initialState);

  const esqlVariablesManager = initializeESQLVariablesManager(
    layoutManager.api.children$,
    settingsManager
  );
  const timesliceManager = initializeTimesliceManager(layoutManager.api.children$, settingsManager);

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
    settingsManager
  );
  const unsavedChangesManager = initializeUnsavedChangesManager({
    viewMode$: viewModeManager.api.viewMode$,
    storeUnsavedChanges: creationOptions?.useSessionStorageIntegration,
    lastSavedState: savedObjectResult?.data ?? DEFAULT_DASHBOARD_STATE,
    layoutManager,
    savedObjectId$,
    settingsManager,
    unifiedSearchManager,
    getReferences,
    filtersManager,
  });

  function getState() {
    const {
      panels,
      controlGroupInput,
      references: panelReferences,
    } = layoutManager.internalApi.serializeLayout();
    const unifiedSearchState = unifiedSearchManager.internalApi.getState();
    const dashboardState: DashboardState = {
      ...settingsManager.internalApi.serializeSettings(),
      ...unifiedSearchState,
      panels,
      controlGroupInput,
    };

    console.log({ getState: dashboardState });
    return {
      dashboardState,
      references: [...(panelReferences ?? [])],
    };
  }

  const trackOverlayApi = initializeTrackOverlay(trackPanel.setFocusedPanelId);

  const isFetchPaused$ = new BehaviorSubject<boolean>(false); // TODO: Make this work and probably move it to another file

  const dashboardApi = {
    isFetchPaused$,
    setFetchPaused: (paused) => isFetchPaused$.next(paused),
    esqlVariables$: esqlVariablesManager.api.publishedEsqlVariables$,
    ...viewModeManager.api,
    ...dataLoadingManager.api,
    ...dataViewsManager.api,
    ...layoutManager.api,
    ...settingsManager.api,
    ...filtersManager.api,
    ...trackPanel,
    ...unifiedSearchManager.api,
    ...unsavedChangesManager.api,
    ...trackOverlayApi,
    ...esqlVariablesManager.api,
    ...timesliceManager.api,
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
    getSerializedState: () => {
      const { dashboardState, references } = getState();
      return {
        attributes: dashboardState,
        references,
      };
    },
    runInteractiveSave: async () => {
      trackOverlayApi.clearOverlays();

      const { description, tags, timeRestore, title } = settingsManager.api.getSettings();
      const saveResult = await openSaveModal({
        description,
        isManaged,
        lastSavedId: savedObjectId$.value,
        serializeState: getState,
        setTimeRestore: (newTimeRestore: boolean) =>
          settingsManager.api.setSettings({ timeRestore: newTimeRestore }),
        tags,
        timeRestore,
        title,
        viewMode: viewModeManager.api.viewMode$.value,
      });

      if (!saveResult || saveResult.error) {
        return;
      }

      if (saveResult) {
        references$.next(saveResult.references);
        unsavedChangesManager.internalApi.onSave(saveResult.savedState);
        const settings = settingsManager.api.getSettings();
        settingsManager.api.setSettings({
          ...settings,
          hidePanelTitles: settings.hidePanelTitles ?? false,
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
      const { dashboardState, references } = getState();
      const saveResult = await saveDashboard({
        dashboardState,
        references,
        saveOptions: {},
        lastSavedId: savedObjectId$.value,
      });

      if (saveResult?.error) return;
      references$.next(saveResult.references);
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
  } as Omit<DashboardApi, 'searchSessionId$'>;

  const internalApi: DashboardInternalApi = {
    ...layoutManager.internalApi,
    ...unifiedSearchManager.internalApi,
    dashboardContainerRef$,
    setDashboardContainerRef: (ref: HTMLElement | null) => dashboardContainerRef$.next(ref),
    // serializeControls: () => controlGroupManager.internalApi.serializeControlGroup(),
    // untilControlsInitialized: controlGroupManager.internalApi.untilControlsInitialized,
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
    },
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
    },
  };
}
