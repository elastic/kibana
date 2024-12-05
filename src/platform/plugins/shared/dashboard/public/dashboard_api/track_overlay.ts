/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { OverlayRef } from '@kbn/core-mount-utils-browser';
import { BehaviorSubject } from 'rxjs';

export function initializeTrackOverlay(setFocusedPanelId: (id: string | undefined) => void) {
  let overlayRef: OverlayRef;
  const hasOverlays$ = new BehaviorSubject(false);

  function clearOverlays() {
    hasOverlays$.next(false);
    setFocusedPanelId(undefined);
    overlayRef?.close();
  }

  return {
    clearOverlays,
    hasOverlays$,
    openOverlay: (ref: OverlayRef, options?: { focusedPanelId?: string }) => {
      clearOverlays();
      hasOverlays$.next(true);
      overlayRef = ref;
      if (options?.focusedPanelId) {
        setFocusedPanelId(options.focusedPanelId);
      }
    },
  };
}
