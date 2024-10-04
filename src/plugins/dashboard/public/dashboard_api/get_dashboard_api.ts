/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject } from 'rxjs';
import { omit } from 'lodash';
import { v4 } from 'uuid';
import type { Reference } from '@kbn/content-management-utils';
import { ControlGroupApi, ControlGroupSerializedState } from '@kbn/controls-plugin/public';
import {
  getReferencesForControls,
  getReferencesForPanelId,
} from '../../common/dashboard_container/persistable_state/dashboard_container_references';
import { initializeTrackPanel } from './track_panel';
import { initializeTrackOverlay } from './track_overlay';
import { initializeUnsavedChanges } from './unsaved_changes';
import { DASHBOARD_APP_ID, DEFAULT_DASHBOARD_INPUT } from '../dashboard_constants';
import { LoadDashboardReturn } from '../services/dashboard_content_management_service/types';
import { initializePanelsManager } from './panels_manager';
import { DASHBOARD_API_TYPE, DashboardCreationOptions, DashboardState } from './types';
import { initializeDataViewsManager } from './data_views_manager';
import { initializeSettingsManager } from './settings_manager';
import { initializeUnifiedSearchManager } from './unified_search_manager';
import { initializeDataLoadingManager } from './data_loading_manager';

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
  const managed$ = new BehaviorSubject(savedObjectResult?.managed ?? false);
  const references: Reference[] = savedObjectResult?.references ?? [];
  const savedObjectId$ = new BehaviorSubject<string | undefined>(savedObjectId);

  let breakCircularDepUntilEmbeddableLoaded: (id: string) => Promise<undefined> = async (
    id: string
  ) => undefined;
  const trackPanel = initializeTrackPanel(breakCircularDepUntilEmbeddableLoaded);
  const panelsManager = initializePanelsManager(initialState.panels, trackPanel, (id: string) =>
    getReferencesForPanelId(id, references)
  );
  breakCircularDepUntilEmbeddableLoaded = panelsManager.untilEmbeddableLoaded;
  const dataLoadingManager = initializeDataLoadingManager(panelsManager.children$);
  const dataViewsManager = initializeDataViewsManager(controlGroupApi$, panelsManager.children$);
  const settingsManager = initializeSettingsManager(initialState);
  const unifiedSearchManager = initializeUnifiedSearchManager(
    initialState,
    controlGroupApi$,
    dataLoadingManager.internalApi.waitForPanelsToLoad$,
    creationOptions
  );

  return {
    api: {
      ...dataLoadingManager.api,
      ...dataViewsManager.api,
      ...panelsManager,
      ...settingsManager.api,
      ...trackPanel,
      ...unifiedSearchManager.api,
      ...initializeTrackOverlay(trackPanel.setFocusedPanelId),
      ...initializeUnsavedChanges(
        savedObjectResult?.anyMigrationRun ?? false,
        omit(savedObjectResult?.dashboardInput, 'controlGroupInput') ?? {
          ...DEFAULT_DASHBOARD_INPUT,
          id: v4(),
        }
      ),
      animatePanelTransforms$,
      fullScreenMode$,
      getAppContext: () => {
        const embeddableAppContext = creationOptions?.getEmbeddableAppContext?.(
          savedObjectId$.value
        );
        return {
          ...embeddableAppContext,
          currentAppId: embeddableAppContext?.currentAppId ?? DASHBOARD_APP_ID,
        };
      },
      isEmbeddedExternally: creationOptions?.isEmbeddedExternally ?? false,
      managed$,
      savedObjectId: savedObjectId$,
      setAnimatePanelTransforms: (animate: boolean) => animatePanelTransforms$.next(animate),
      setFullScreenMode: (fullScreenMode: boolean) => fullScreenMode$.next(fullScreenMode),
      setManaged: (managed: boolean) => managed$.next(managed),
      setSavedObjectId: (id: string | undefined) => savedObjectId$.next(id),
      type: DASHBOARD_API_TYPE as 'dashboard',
    },
    internalApi: {
      getSerializedStateForControlGroup: () => {
        return {
          rawState: initialState.controlGroupInput
            ? initialState.controlGroupInput
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
      ...unifiedSearchManager.internalApi,
    },
    cleanup: () => {
      dataLoadingManager.cleanup();
      dataViewsManager.cleanup();
      unifiedSearchManager.cleanup();
    },
  };
}
