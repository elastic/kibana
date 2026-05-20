/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { OverlayRef } from '@kbn/core-mount-utils-browser';

/** Flyout layout for lazy panel edit flyouts opened from a {@link TracksOverlays} host. */
export type LazyFlyoutType = 'push' | 'overlay';

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
   * Preferred flyout type for lazy panel edit flyouts opened from this host.
   * Child embeddables inherit this via {@link resolveLazyFlyoutTypeFromAncestors}.
   */
  lazyFlyoutType?: LazyFlyoutType;
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

const getParentApi = (api: unknown): unknown | undefined => {
  if (!api || typeof api !== 'object' || !('parentApi' in api)) {
    return undefined;
  }

  return (api as { parentApi?: unknown }).parentApi;
};

/**
 * Walks the embeddable parent chain to find the nearest {@link TracksOverlays} ancestor.
 */
export const findTracksOverlaysAncestor = (
  api: unknown | undefined
): TracksOverlays | undefined => {
  let current = api;

  while (current) {
    if (tracksOverlays(current)) {
      return current;
    }
    current = getParentApi(current);
  }

  return undefined;
};

/**
 * Resolves lazy flyout type from the nearest {@link TracksOverlays} ancestor.
 */
export const resolveLazyFlyoutTypeFromAncestors = (
  api: unknown | undefined
): LazyFlyoutType | undefined => findTracksOverlaysAncestor(api)?.lazyFlyoutType;
