/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { OverlayRef } from '@kbn/core-mount-utils-browser';

interface TracksOverlaysOptions {
  /**
   * If present, the panel with this ID will be focused when the overlay is opened. This can be used in tandem with a push
   * flyout to edit a panel's settings in context
   */
  focusedPanelId?: string;
}

export interface TracksOverlays {
  openOverlay: (ref: OverlayRef, options?: TracksOverlaysOptions) => void;
  clearOverlays: () => void;
}

export const tracksOverlays = (root: unknown): root is TracksOverlays => {
  return Boolean(
    root && (root as TracksOverlays).openOverlay && (root as TracksOverlays).clearOverlays
  );
};
