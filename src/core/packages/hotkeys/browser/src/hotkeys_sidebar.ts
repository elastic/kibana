/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HotkeyDefinition } from './types';

/**
 * Persisted sidebar store state for the `hotkeys` chrome sidebar app.
 *
 * @public
 */
export interface HotkeysSidebarState {
  /** When set, the cheat sheet seeds the filter search with this value until consumed. */
  pendingFeatureFocus?: string | null;
}

/**
 * Bound actions for the `hotkeys` sidebar app from `chrome.sidebar.getApp('hotkeys')`.
 *
 * @public
 */
export interface HotkeysSidebarActions {
  /** Opens the shortcuts panel and pre-fills search so shortcuts for `featureId` surface first; users can clear or edit search to browse all shortcuts. */
  openToFeature: (featureId: string) => void;
  /** Clears {@link HotkeysSidebarState.pendingFeatureFocus} after the cheat sheet applies it (normally internal to the cheat sheet). */
  clearPendingFeatureFocus: () => void;
  /** Persist a user override for the chord bound to `hotkeyId` (merged into any existing override for that id). */
  setHotkeyOverride: (hotkeyId: string, keys: HotkeyDefinition['keys']) => void;
  /** Drop the stored override for `hotkeyId` so the declared default chord applies again. */
  clearHotkeyOverride: (hotkeyId: string) => void;
}
