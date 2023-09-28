/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { OverlayRef } from '@kbn/core-mount-utils-browser';

interface TracksOverlaysOptions {
  focusedPanelId?: string;
}

interface TracksOverlays {
  openOverlay: (ref: OverlayRef, options?: TracksOverlaysOptions) => void;
  clearOverlays: () => void;
}

export const tracksOverlays = (root: unknown): root is TracksOverlays => {
  return Boolean((root as TracksOverlays).openOverlay && (root as TracksOverlays).clearOverlays);
};
