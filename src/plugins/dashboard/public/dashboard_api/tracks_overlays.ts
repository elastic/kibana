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

export function initializeTracksOverlays() {
  let overlayRef: OverlayRef;
  const focusedPanelId$ = new BehaviorSubject<string | undefined>(undefined);
  const hasOverlayers$ = new BehaviorSubject(false);
  const scrollToPanelId$ = new BehaviorSubject<string | undefined>(undefined);

  function clearOverlays() {
    hasOverlayers$.next(false);
    focusedPanelId$.next(undefined);
    scrollToPanelId$.next(undefined);
    overlayRef?.close();
  }

  return {
    clearOverlays,
    focusedPanelId$,
    hasOverlayers$,
    openOverlay: (ref: OverlayRef, options?: { focusedPanelId?: string }) => {
      clearOverlays();
      hasOverlayers$.next(true);
      overlayRef = ref;
      if (options?.focusedPanelId) {
        focusedPanelId$.next(options.focusedPanelId);
        scrollToPanelId$.next(options.focusedPanelId);
      }
    },
    setScrollToPanelId: (id: string | undefined) => scrollToPanelId$.next(id),
    scrollToPanelId$,
  }
}