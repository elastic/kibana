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
import { initializeTrackPanel } from './track_panel';
import { initializeTrackOverlay } from './track_overlay';
import { initializeUnsavedChanges } from './unsaved_changes';
import { DASHBOARD_APP_ID, DEFAULT_DASHBOARD_INPUT } from '../dashboard_constants';
import { LoadDashboardReturn } from '../services/dashboard_content_management_service/types';
import { initializePanelsManager } from './panels_manager';
import { DASHBOARD_API_TYPE, DashboardCreationOptions, DashboardState } from './types';

export function getDashboardApi({
  dashboardState,
  getEmbeddableAppContext,
  isEmbeddedExternally,
  savedObjectResult,
  savedObjectId,
}: {
  dashboardState: DashboardState;
  getEmbeddableAppContext?: DashboardCreationOptions['getEmbeddableAppContext'];
  isEmbeddedExternally?: boolean;
  savedObjectResult?: LoadDashboardReturn;
  savedObjectId?: string;
}) {
  const animatePanelTransforms$ = new BehaviorSubject(false); // set panel transforms to false initially to avoid panels animating on initial render.
  const fullScreenMode$ = new BehaviorSubject(false);
  const managed$ = new BehaviorSubject(savedObjectResult?.managed ?? false);
  const savedObjectId$ = new BehaviorSubject<string | undefined>(savedObjectId);

  let untilEmbeddableLoaded: (id: string) => Promise<undefined> = async (id: string) => undefined;
  const trackPanel = initializeTrackPanel(untilEmbeddableLoaded);
  const panelsManager = initializePanelsManager(
    dashboardState.panels,
    savedObjectResult?.references ?? [],
    trackPanel
  );
  untilEmbeddableLoaded = panelsManager.untilEmbeddableLoaded;

  return {
    api: {
      ...trackPanel,
      ...panelsManager,
      ...initializeTrackOverlay(trackPanel.setFocusedPanelId),
      ...initializeUnsavedChanges(
        savedObjectResult?.anyMigrationRun ?? false,
        omit(savedObjectResult?.dashboardInput, 'controlGroupInput') ?? {
          ...DEFAULT_DASHBOARD_INPUT,
          id: input.id,
        }
      ),
      animatePanelTransforms$,
      fullScreenMode$,
      getAppContext: () => {
        const embeddableAppContext = getEmbeddableAppContext?.(savedObjectId$.value);
        return {
          ...embeddableAppContext,
          currentAppId: embeddableAppContext?.currentAppId ?? DASHBOARD_APP_ID,
        };
      },
      isEmbeddedExternally: isEmbeddedExternally ?? false,
      managed$,
      savedObjectId: savedObjectId$,
      setAnimatePanelTransforms: (animate: boolean) => animatePanelTransforms$.next(animate),
      setFullScreenMode: (fullScreenMode: boolean) => fullScreenMode$.next(fullScreenMode),
      setManaged: (managed: boolean) => managed$.next(managed),
      setSavedObjectId: (id: string | undefined) => savedObjectId$.next(id),
      type: DASHBOARD_API_TYPE as 'dashboard',
    },
    cleanup: () => {},
  };
}
