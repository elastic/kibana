/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject, merge } from 'rxjs';
import { omit } from 'lodash';
import { v4 } from 'uuid';
import type { Reference } from '@kbn/content-management-utils';
import { ControlGroupApi, ControlGroupSerializedState } from '@kbn/controls-plugin/public';
import { ViewMode } from '@kbn/presentation-publishing';
import {
  getReferencesForControls,
  getReferencesForPanelId,
} from '../../common/dashboard_container/persistable_state/dashboard_container_references';
import { initializeTrackPanel } from './track_panel';
import { initializeTrackOverlay } from './track_overlay';
import { initializeUnsavedChangesManager } from './unsaved_changes_manager';
import { DASHBOARD_APP_ID, DEFAULT_DASHBOARD_INPUT } from '../dashboard_constants';
import { LoadDashboardReturn } from '../services/dashboard_content_management_service/types';
import { initializePanelsManager } from './panels_manager';
import {
  DASHBOARD_API_TYPE,
  DashboardApi,
  DashboardCreationOptions,
  DashboardInternalApi,
  DashboardState,
} from './types';
import { initializeDataViewsManager } from './data_views_manager';
import { initializeSettingsManager } from './settings_manager';
import { initializeUnifiedSearchManager } from './unified_search_manager';
import { initializeDataLoadingManager } from './data_loading_manager';
import { PANELS_CONTROL_GROUP_KEY } from '../services/dashboard_backup_service';
import { getDashboardContentManagementService } from '../services/dashboard_content_management_service';
import { openSaveModal } from './open_save_modal';
import { initializeSearchSessionManager } from './search_session_manager';

export function getDashboardApi({
  creationOptions,
  initialState,
  savedObjectResult,
  savedObjectId,
}: {
  creationOptions?: DashboardCreationOptions;
  initialState: DashboardState;
  savedObjectResult?: LoadDashboardReturn;
  savedObjectId?: string;
}) {
  const animatePanelTransforms$ = new BehaviorSubject(false); // set panel transforms to false initially to avoid panels animating on initial render.
  const controlGroupApi$ = new BehaviorSubject<ControlGroupApi | undefined>(undefined);
  const fullScreenMode$ = new BehaviorSubject(false);
  const isManaged = savedObjectResult?.managed ?? false;
  let references: Reference[] = savedObjectResult?.references ?? [];
  const savedObjectId$ = new BehaviorSubject<string | undefined>(savedObjectId);
  const viewMode$ = new BehaviorSubject<ViewMode>(initialState.viewMode);

  let untilEmbeddableLoadedBreakCircularDep: (id: string) => Promise<undefined> = async (
    id: string
  ) => undefined;
  const trackPanel = initializeTrackPanel(untilEmbeddableLoadedBreakCircularDep);
  const panelsManager = initializePanelsManager(
    initialState.panels,
    trackPanel,
    (id: string) => getReferencesForPanelId(id, references),
    (refs: Reference[]) => references.push(...refs)
  );
  untilEmbeddableLoadedBreakCircularDep = panelsManager.api.untilEmbeddableLoaded;
  const dataLoadingManager = initializeDataLoadingManager(panelsManager.api.children$);
  const dataViewsManager = initializeDataViewsManager(
    controlGroupApi$,
    panelsManager.api.children$
  );
  const unifiedSearchManager = initializeUnifiedSearchManager(
    initialState,
    controlGroupApi$,
    dataLoadingManager.internalApi.waitForPanelsToLoad$,
    creationOptions
  );
  const settingsManager = initializeSettingsManager({
    initialState,
    setTimeRestore: unifiedSearchManager.internalApi.setTimeRestore,
    timeRestore$: unifiedSearchManager.internalApi.timeRestore$,
  });
  const unsavedChangesManager = initializeUnsavedChangesManager({
    anyMigrationRun: savedObjectResult?.anyMigrationRun ?? false,
    creationOptions,
    controlGroupApi$,
    lastSavedState: omit(savedObjectResult?.dashboardInput, 'controlGroupInput') ?? {
      ...DEFAULT_DASHBOARD_INPUT,
    },
    panelsManager,
    savedObjectId$,
    settingsManager,
    unifiedSearchManager,
  });
  async function getState() {
    const { panels, references: panelReferences } = await panelsManager.internalApi.getState();
    const dashboardState: DashboardState = {
      ...settingsManager.api.getSettings(),
      ...unifiedSearchManager.internalApi.getState(),
      panels,
      viewMode: viewMode$.value,
    };

    const controlGroupApi = controlGroupApi$.value;
    let controlGroupReferences: Reference[] | undefined;
    if (controlGroupApi) {
      const { rawState: controlGroupSerializedState, references: extractedReferences } =
        await controlGroupApi.serializeState();
      controlGroupReferences = extractedReferences;
      dashboardState.controlGroupInput = controlGroupSerializedState;
    }

    return {
      dashboardState,
      controlGroupReferences,
      panelReferences,
    };
  }

  const trackOverlayApi = initializeTrackOverlay(trackPanel.setFocusedPanelId);

  // Start animating panel transforms 500 ms after dashboard is created.
  setTimeout(() => animatePanelTransforms$.next(true), 500);

  const dashboardApi = {
    ...dataLoadingManager.api,
    ...dataViewsManager.api,
    ...panelsManager.api,
    ...settingsManager.api,
    ...trackPanel,
    ...unifiedSearchManager.api,
    ...unsavedChangesManager.api,
    ...trackOverlayApi,
    controlGroupApi$,
    fullScreenMode$,
    getAppContext: () => {
      const embeddableAppContext = creationOptions?.getEmbeddableAppContext?.(savedObjectId$.value);
      return {
        ...embeddableAppContext,
        currentAppId: embeddableAppContext?.currentAppId ?? DASHBOARD_APP_ID,
      };
    },
    isEmbeddedExternally: creationOptions?.isEmbeddedExternally ?? false,
    isManaged,
    runInteractiveSave: async () => {
      trackOverlayApi.clearOverlays();
      const saveResult = await openSaveModal({
        isManaged,
        lastSavedId: savedObjectId$.value,
        viewMode: viewMode$.value,
        ...(await getState()),
      });

      if (saveResult) {
        unsavedChangesManager.internalApi.onSave(saveResult.savedState);
        const settings = settingsManager.api.getSettings();
        settingsManager.api.setSettings({
          ...settings,
          hidePanelTitles: settings.hidePanelTitles ?? false,
          description: saveResult.savedState.description,
          tags: saveResult.savedState.tags,
          timeRestore: saveResult.savedState.timeRestore,
          title: saveResult.savedState.title,
        });
        savedObjectId$.next(saveResult.id);

        references = saveResult.references ?? [];
      }

      return saveResult;
    },
    runQuickSave: async () => {
      if (isManaged) return;
      const { controlGroupReferences, dashboardState, panelReferences } = await getState();
      const saveResult = await getDashboardContentManagementService().saveDashboardState({
        controlGroupReferences,
        currentState: dashboardState,
        panelReferences,
        saveOptions: {},
        lastSavedId: savedObjectId$.value,
      });

      unsavedChangesManager.internalApi.onSave(dashboardState);
      references = saveResult.references ?? [];

      return;
    },
    savedObjectId: savedObjectId$,
    setFullScreenMode: (fullScreenMode: boolean) => fullScreenMode$.next(fullScreenMode),
    setSavedObjectId: (id: string | undefined) => savedObjectId$.next(id),
    setViewMode: (viewMode: ViewMode) => {
      // block the Dashboard from entering edit mode if this Dashboard is managed.
      if (isManaged && viewMode?.toLowerCase() === 'edit') {
        return;
      }
      viewMode$.next(viewMode);
    },
    type: DASHBOARD_API_TYPE as 'dashboard',
    uuid: v4(),
    viewMode: viewMode$,
  } as Omit<DashboardApi, 'reload$' | 'searchSessionId$'>;

  const searchSessionManager = initializeSearchSessionManager(
    creationOptions?.searchSessionSettings,
    creationOptions?.getIncomingEmbeddable,
    {
      ...dashboardApi,
      reload$: merge(
        unifiedSearchManager.internalApi.controlGroupReload$,
        unifiedSearchManager.internalApi.panelsReload$
      ),
    }
  );

  return {
    api: {
      ...dashboardApi,
      ...searchSessionManager.api,
    },
    internalApi: {
      ...panelsManager.internalApi,
      ...unifiedSearchManager.internalApi,
      animatePanelTransforms$,
      getSerializedStateForControlGroup: () => {
        return {
          rawState: savedObjectResult?.dashboardInput?.controlGroupInput
            ? savedObjectResult.dashboardInput.controlGroupInput
            : ({
                controlStyle: 'oneLine',
                chainingSystem: 'HIERARCHICAL',
                showApplySelections: false,
                panelsJSON: '{}',
                ignoreParentSettingsJSON:
                  '{"ignoreFilters":false,"ignoreQuery":false,"ignoreTimerange":false,"ignoreValidations":false}',
              } as ControlGroupSerializedState),
          references: getReferencesForControls(references),
        };
      },
      getRuntimeStateForControlGroup: () => {
        return panelsManager.api.getRuntimeStateForChild(PANELS_CONTROL_GROUP_KEY);
      },
      setControlGroupApi: (controlGroupApi: ControlGroupApi) =>
        controlGroupApi$.next(controlGroupApi),
    } as DashboardInternalApi,
    cleanup: () => {
      dataLoadingManager.cleanup();
      dataViewsManager.cleanup();
      searchSessionManager.cleanup();
      unifiedSearchManager.cleanup();
      unsavedChangesManager.cleanup();
    },
  };
}
