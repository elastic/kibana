/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

/**
 * Returned by {@link OverlayStart} methods for closing a mounted overlay.
 * @public
 */
export interface OverlayRef {
  /**
   * A Promise that will resolve once this overlay is closed.
   *
   * Overlays can close from user interaction, calling `close()` on the overlay
   * reference or another overlay replacing yours via `openModal` or `openFlyout`.
   */
  onClose: Promise<void>;

  /**
   * Closes the referenced overlay if it's still open which in turn will
   * resolve the `onClose` Promise. If the overlay had already been
   * closed this method does nothing.
   */
  close(): Promise<void>;
}
