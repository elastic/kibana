/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Reference } from '@kbn/content-management-utils';
import { ControlGroupApi, ControlGroupSerializedState } from '@kbn/controls-plugin/public';
import { EmbeddablePackageState } from '@kbn/embeddable-plugin/public';
import { StateComparators } from '@kbn/presentation-publishing';
import { omit } from 'lodash';
import { BehaviorSubject, debounceTime, merge } from 'rxjs';
import { v4 } from 'uuid';
import {
  getReferencesForControls,
  getReferencesForPanelId,
} from '../../common/dashboard_container/persistable_state/dashboard_container_references';
import { UnsavedPanelState } from '../dashboard_container/types';
import { DASHBOARD_APP_ID } from '../plugin_constants';
import { PANELS_CONTROL_GROUP_KEY } from '../services/dashboard_backup_service';
import { getDashboardContentManagementService } from '../services/dashboard_content_management_service';
import { LoadDashboardReturn } from '../services/dashboard_content_management_service/types';
import { initializeDataLoadingManager } from './data_loading_manager';
import { initializeDataViewsManager } from './data_views_manager';
import { DEFAULT_DASHBOARD_STATE } from './default_dashboard_state';
import { getSerializedState } from './get_serialized_state';
import { openSaveModal } from './open_save_modal';
import { initializePanelsManager } from './panels_manager';
import { initializeSearchSessionManager } from './search_session_manager';
import { initializeSettingsManager } from './settings_manager';
import { initializeTrackContentfulRender } from './track_contentful_render';
import { initializeTrackOverlay } from './track_overlay';
import { initializeTrackPanel } from './track_panel';
import {
  DASHBOARD_API_TYPE,
  DashboardApi,
  DashboardCreationOptions,
  DashboardInternalApi,
  DashboardState,
} from './types';
import { initializeUnifiedSearchManager } from './unified_search_manager';
import { initializeUnsavedChangesManager } from './unsaved_changes_manager';
import { initializeViewModeManager } from './view_mode_manager';

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
  const controlGroupApi$ = new BehaviorSubject<ControlGroupApi | undefined>(undefined);
  const fullScreenMode$ = new BehaviorSubject(creationOptions?.fullScreenMode ?? false);
  const isManaged = savedObjectResult?.managed ?? false;
  const savedObjectId$ = new BehaviorSubject<string | undefined>(savedObjectId);

  const viewModeManager = initializeViewModeManager(incomingEmbeddable, savedObjectResult);
  const trackPanel = initializeTrackPanel(
    async (id: string) => await panelsManager.api.untilEmbeddableLoaded(id)
  );

  const references$ = new BehaviorSubject<Reference[] | undefined>(initialState.references);
  const getPanelReferences = (id: string) => {
    const panelReferences = getReferencesForPanelId(id, references$.value ?? []);
    // references from old installations may not be prefixed with panel id
    // fall back to passing all references in these cases to preserve backwards compatability
    return panelReferences.length > 0 ? panelReferences : references$.value ?? [];
  };
  const pushPanelReferences = (refs: Reference[]) => {
    references$.next([...(references$.value ?? []), ...refs]);
  };
  const referencesComparator: StateComparators<Pick<DashboardState, 'references'>> = {
    references: [references$, (nextRefs) => references$.next(nextRefs)],
  };

  const panelsManager = initializePanelsManager(
    incomingEmbeddable,
    initialState.panels,
    initialPanelsRuntimeState ?? {},
    trackPanel,
    getPanelReferences,
    pushPanelReferences
  );
  const dataLoadingManager = initializeDataLoadingManager(panelsManager.api.children$);
  const dataViewsManager = initializeDataViewsManager(
    controlGroupApi$,
    panelsManager.api.children$
  );
  const settingsManager = initializeSettingsManager(initialState);
  const unifiedSearchManager = initializeUnifiedSearchManager(
    initialState,
    controlGroupApi$,
    settingsManager.api.timeRestore$,
    dataLoadingManager.internalApi.waitForPanelsToLoad$,
    () => unsavedChangesManager.internalApi.getLastSavedState(),
    creationOptions
  );
  const unsavedChangesManager = initializeUnsavedChangesManager({
    creationOptions,
    controlGroupApi$,
    lastSavedState: omit(savedObjectResult?.dashboardInput, 'controlGroupInput') ?? {
      ...DEFAULT_DASHBOARD_STATE,
    },
    panelsManager,
    savedObjectId$,
    settingsManager,
    viewModeManager,
    unifiedSearchManager,
    referencesComparator,
  });
  function getState() {
    const { panels, references: panelReferences } = panelsManager.internalApi.getState();
    const { state: unifiedSearchState, references: searchSourceReferences } =
      unifiedSearchManager.internalApi.getState();
    const dashboardState: DashboardState = {
      ...settingsManager.internalApi.getState(),
      ...unifiedSearchState,
      panels,
      viewMode: viewModeManager.api.viewMode$.value,
    };

    const controlGroupApi = controlGroupApi$.value;
    let controlGroupReferences: Reference[] | undefined;
    if (controlGroupApi) {
      const { rawState: controlGroupSerializedState, references: extractedReferences } =
        controlGroupApi.serializeState();
      controlGroupReferences = extractedReferences;
      dashboardState.controlGroupInput = controlGroupSerializedState;
    }

    return {
      dashboardState,
      controlGroupReferences,
      panelReferences,
      searchSourceReferences,
    };
  }

  const trackOverlayApi = initializeTrackOverlay(trackPanel.setFocusedPanelId);

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
    reload$: merge(
      unifiedSearchManager.internalApi.controlGroupReload$,
      unifiedSearchManager.internalApi.panelsReload$
    ).pipe(debounceTime(0)),
    getSerializedState: () => getSerializedState(getState()),
    runInteractiveSave: async () => {
      trackOverlayApi.clearOverlays();
      const saveResult = await openSaveModal({
        isManaged,
        lastSavedId: savedObjectId$.value,
        viewMode: viewModeManager.api.viewMode$.value,
        ...getState(),
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

        references$.next(saveResult.references);
      }

      return saveResult;
    },
    runQuickSave: async () => {
      if (isManaged) return;
      const { controlGroupReferences, dashboardState, panelReferences, searchSourceReferences } =
        getState();
      const saveResult = await getDashboardContentManagementService().saveDashboardState({
        controlGroupReferences,
        dashboardState,
        panelReferences,
        searchSourceReferences,
        saveOptions: {},
        lastSavedId: savedObjectId$.value,
      });

      unsavedChangesManager.internalApi.onSave(dashboardState);
      references$.next(saveResult.references);

      return;
    },
    savedObjectId$,
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
          references: getReferencesForControls(references$.value ?? []),
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
      unsavedChangesManager.cleanup();
    },
  };
}
