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
import type { DashboardContainerInput } from '../../common';
import { initializeTrackPanel } from './track_panel';
import { initializeTrackOverlay } from './track_overlay';
import { initializeUnsavedChanges } from './unsaved_changes';
import { initializePanelsManager } from './panels_manager';
import { LoadDashboardReturn } from '../services/dashboard_content_management_service/types';
import { DEFAULT_DASHBOARD_INPUT } from '../dashboard_constants';

export function getDashboardApi({
  isEmbeddedExternally,
  savedObjectId,
  savedObjectResult,
  initialInput,
  untilEmbeddableLoaded,
}: {
  isEmbeddedExternally?: boolean;
  savedObjectId?: string;
  savedObjectResult?: LoadDashboardReturn;
  initialInput: DashboardContainerInput;
  untilEmbeddableLoaded: (id: string) => Promise<unknown>;
}) {
  const animatePanelTransforms$ = new BehaviorSubject(false); // set panel transforms to false initially to avoid panels animating on initial render.
  const fullScreenMode$ = new BehaviorSubject(false);
  const managed$ = new BehaviorSubject(savedObjectResult?.managed ?? false);
  const savedObjectId$ = new BehaviorSubject<string | undefined>(savedObjectId);

  const trackPanel = initializeTrackPanel(untilEmbeddableLoaded);

  return {
    ...trackPanel,
    ...initializePanelsManager(initialInput.panels, savedObjectResult?.references ?? []),
    ...initializeTrackOverlay(trackPanel.setFocusedPanelId),
    ...initializeUnsavedChanges(
      savedObjectResult?.anyMigrationRun ?? false,
      omit(savedObjectResult?.dashboardInput, 'controlGroupInput') ?? {
        ...DEFAULT_DASHBOARD_INPUT,
        id: initialInput.id,
      }
    ),
    animatePanelTransforms$,
    fullScreenMode$,
    isEmbeddedExternally: isEmbeddedExternally ?? false,
    managed$,
    savedObjectId: savedObjectId$,
    setAnimatePanelTransforms: (animate: boolean) => animatePanelTransforms$.next(animate),
    setFullScreenMode: (fullScreenMode: boolean) => fullScreenMode$.next(fullScreenMode),
    setManaged: (managed: boolean) => managed$.next(managed),
    setSavedObjectId: (id: string | undefined) => savedObjectId$.next(id),
  };
}
