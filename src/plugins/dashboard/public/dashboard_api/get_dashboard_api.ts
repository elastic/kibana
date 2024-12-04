/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject, debounceTime, merge } from 'rxjs';
import { omit } from 'lodash';
import { v4 } from 'uuid';
import type { Reference } from '@kbn/content-management-utils';
import { ControlGroupApi, ControlGroupSerializedState } from '@kbn/controls-plugin/public';
import { EmbeddablePackageState } from '@kbn/embeddable-plugin/public';
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
import { initializeViewModeManager } from './view_mode_manager';
import { UnsavedPanelState } from '../dashboard_container/types';
import { initializeTrackContentfulRender } from './track_contentful_render';

export function getDashboardApi({
  creationOptions,
  incomingEmbeddable,
  initialState,
  initialPanelsRuntimeState,
  savedObjectResult,
  savedObjectId,
}: {
  creationOptions?: DashboardCreationOptions;
  incomingEmbeddable?: EmbeddablePackageState | undefined;
  initialState: DashboardState;
  initialPanelsRuntimeState?: UnsavedPanelState;
  savedObjectResult?: LoadDashboardReturn;
  savedObjectId?: string;
}) {
  const animatePanelTransforms$ = new BehaviorSubject(false); // set panel transforms to false initially to avoid panels animating on initial render.
  const controlGroupApi$ = new BehaviorSubject<ControlGroupApi | undefined>(undefined);
  const fullScreenMode$ = new BehaviorSubject(creationOptions?.fullScreenMode ?? false);
  const isManaged = savedObjectResult?.managed ?? false;
  let references: Reference[] = savedObjectResult?.references ?? [];
  const savedObjectId$ = new BehaviorSubject<string | undefined>(savedObjectId);

  const viewModeManager = initializeViewModeManager(incomingEmbeddable, savedObjectResult);
  // panelsManager is assigned after trackPanel
  // eslint-disable-next-line prefer-const
  let panelsManager: ReturnType<typeof initializePanelsManager> | undefined;
  const trackPanel = initializeTrackPanel(async (id: string) =>
    panelsManager ? await panelsManager.api.untilEmbeddableLoaded(id) : undefined
  );
  function getPanelReferences(id: string) {
    const panelReferences = getReferencesForPanelId(id, references);
    // references from old installations may not be prefixed with panel id
    // fall back to passing all references in these cases to preserve backwards compatability
    return panelReferences.length > 0 ? panelReferences : references;
  }
  panelsManager = initializePanelsManager(
    incomingEmbeddable,
    initialState.panels,
    initialPanelsRuntimeState ?? {},
    trackPanel,
    getPanelReferences,
    (refs: Reference[]) => references.push(...refs)
  );
  const dataLoadingManager = initializeDataLoadingManager(panelsManager.api.children$);
  const dataViewsManager = initializeDataViewsManager(
    controlGroupApi$,
    panelsManager.api.children$
  );
  // unsavedChangesManager is assigned after unifiedSearchManager
  // eslint-disable-next-line prefer-const
  let unsavedChangesManager: ReturnType<typeof initializeUnsavedChangesManager> | undefined;
  const unifiedSearchManager = initializeUnifiedSearchManager(
    initialState,
    controlGroupApi$,
    dataLoadingManager.internalApi.waitForPanelsToLoad$,
    () =>
      unsavedChangesManager ? unsavedChangesManager.internalApi.getLastSavedState() : undefined,
    creationOptions
  );
  const settingsManager = initializeSettingsManager({
    initialState,
    setTimeRestore: unifiedSearchManager.internalApi.setTimeRestore,
    timeRestore$: unifiedSearchManager.internalApi.timeRestore$,
  });
  unsavedChangesManager = initializeUnsavedChangesManager({
    anyMigrationRun: savedObjectResult?.anyMigrationRun ?? false,
    creationOptions,
    controlGroupApi$,
    lastSavedState: omit(savedObjectResult?.dashboardInput, 'controlGroupInput') ?? {
      ...DEFAULT_DASHBOARD_INPUT,
    },
    panelsManager,
    savedObjectId$,
    settingsManager,
    viewModeManager,
    unifiedSearchManager,
  });
  async function getState() {
    const { panels, references: panelReferences } = await panelsManager!.internalApi.getState();
    const dashboardState: DashboardState = {
      ...settingsManager.internalApi.getState(),
      ...unifiedSearchManager.internalApi.getState(),
      panels,
      viewMode: viewModeManager.api.viewMode.value,
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
    ...viewModeManager.api,
    ...dataLoadingManager.api,
    ...dataViewsManager.api,
    ...panelsManager.api,
    ...settingsManager.api,
    ...trackPanel,
    ...unifiedSearchManager.api,
    ...unsavedChangesManager.api,
    ...trackOverlayApi,
    ...initializeTrackContentfulRender(),
    controlGroupApi$,
    executionContext: {
      type: 'dashboard',
      description: settingsManager.api.panelTitle.value,
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
    reload$: merge(
      unifiedSearchManager.internalApi.controlGroupReload$,
      unifiedSearchManager.internalApi.panelsReload$
    ).pipe(debounceTime(0)),
    runInteractiveSave: async () => {
      trackOverlayApi.clearOverlays();
      const saveResult = await openSaveModal({
        isManaged,
        lastSavedId: savedObjectId$.value,
        viewMode: viewModeManager.api.viewMode.value,
        ...(await getState()),
      });

      if (saveResult) {
        unsavedChangesManager!.internalApi.onSave(saveResult.savedState);
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

      unsavedChangesManager!.internalApi.onSave(dashboardState);
      references = saveResult.references ?? [];

      return;
    },
    savedObjectId: savedObjectId$,
    setFullScreenMode: (fullScreenMode: boolean) => fullScreenMode$.next(fullScreenMode),
    setSavedObjectId: (id: string | undefined) => savedObjectId$.next(id),
    type: DASHBOARD_API_TYPE as 'dashboard',
    uuid: v4(),
  } as Omit<DashboardApi, 'searchSessionId$'>;

  const searchSessionManager = initializeSearchSessionManager(
    creationOptions?.searchSessionSettings,
    incomingEmbeddable,
    dashboardApi
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
                autoApplySelections: true,
                chainingSystem: 'HIERARCHICAL',
                controls: [],
                ignoreParentSettings: {
                  ignoreFilters: false,
                  ignoreQuery: false,
                  ignoreTimerange: false,
                  ignoreValidations: false,
                },
                labelPosition: 'oneLine',
                showApplySelections: false,
              } as ControlGroupSerializedState),
          references: getReferencesForControls(references),
        };
      },
      getRuntimeStateForControlGroup: () => {
        return panelsManager!.api.getRuntimeStateForChild(PANELS_CONTROL_GROUP_KEY);
      },
      setControlGroupApi: (controlGroupApi: ControlGroupApi) =>
        controlGroupApi$.next(controlGroupApi),
    } as DashboardInternalApi,
    cleanup: () => {
      dataLoadingManager.cleanup();
      dataViewsManager.cleanup();
      searchSessionManager.cleanup();
      unifiedSearchManager.cleanup();
      unsavedChangesManager!.cleanup();
    },
  };
}
