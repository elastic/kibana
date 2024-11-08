/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject } from 'rxjs';
import type { DashboardContainerInput } from '../../common';
import { initializeTrackPanel } from './track_panel';
import { initializeTrackOverlay } from './track_overlay';
import { initializeUnsavedChanges } from './unsaved_changes';

export interface InitialComponentState {
  anyMigrationRun: boolean;
  isEmbeddedExternally: boolean;
  lastSavedInput: DashboardContainerInput;
  lastSavedId: string | undefined;
  managed: boolean;
  fullScreenMode: boolean;
}

export function getDashboardApi(
  initialComponentState: InitialComponentState,
  untilEmbeddableLoaded: (id: string) => Promise<unknown>
) {
  const animatePanelTransforms$ = new BehaviorSubject(false); // set panel transforms to false initially to avoid panels animating on initial render.
  const fullScreenMode$ = new BehaviorSubject(initialComponentState.fullScreenMode);
  const managed$ = new BehaviorSubject(initialComponentState.managed);
  const savedObjectId$ = new BehaviorSubject<string | undefined>(initialComponentState.lastSavedId);

  const trackPanel = initializeTrackPanel(untilEmbeddableLoaded);

  return {
    ...trackPanel,
    ...initializeTrackOverlay(trackPanel.setFocusedPanelId),
    ...initializeUnsavedChanges(
      initialComponentState.anyMigrationRun,
      initialComponentState.lastSavedInput
    ),
    animatePanelTransforms$,
    fullScreenMode$,
    isEmbeddedExternally: initialComponentState.isEmbeddedExternally,
    managed$,
    savedObjectId: savedObjectId$,
    setAnimatePanelTransforms: (animate: boolean) => animatePanelTransforms$.next(animate),
    setFullScreenMode: (fullScreenMode: boolean) => fullScreenMode$.next(fullScreenMode),
    setManaged: (managed: boolean) => managed$.next(managed),
    setSavedObjectId: (id: string | undefined) => savedObjectId$.next(id),
  };
}
