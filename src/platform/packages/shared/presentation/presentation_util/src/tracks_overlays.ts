/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { OverlayRef } from '@kbn/core-mount-utils-browser';

/**
 * Options for tracking overlays.
 *
 * @public
 */
export interface TracksOverlaysOptions {
  /**
   * If present, the panel with this ID will be focused when the overlay is opened. This can be used in tandem with a push
   * flyout to edit a panel's settings in context
   */
  focusedPanelId?: string;
}

/**
 * API for tracking overlays.
 *
 * Used by parent containers (like dashboards) to track opened overlays (e.g. flyouts) and clear them when needed.
 *
 * @public
 */
export interface TracksOverlays {
  /**
   * Registers an overlay.
   *
   * @param ref - The overlay reference to track.
   * @param options - Optional options such as `focusedPanelId` for context.
   */
  openOverlay: (ref: OverlayRef, options?: TracksOverlaysOptions) => void;
  /**
   * Clears all tracked overlays.
   *
   * Typically called when the container is destroyed or when overlays should be force-closed.
   */
  clearOverlays: () => void;
}

/**
 * Type guard to check if an object implements {@link TracksOverlays}.
 *
 * @param root - The object to check.
 * @returns `true` if the object has `openOverlay` and `clearOverlays` methods.
 */
export const tracksOverlays = (root: unknown): root is TracksOverlays => {
  return Boolean(
    root && (root as TracksOverlays).openOverlay && (root as TracksOverlays).clearOverlays
  );
};
