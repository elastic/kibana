/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MainHistoryLocationState } from '../../common';
import type { DiscoverAppState } from '../application/main/state_management/redux';

/**
 * The location state a navigation can hand to Discover to seed the tab it is about to initialize,
 * e.g. an ad hoc data view spec from a locator, or the default app state from the "New session"
 * action.
 */
export interface InitialTabState extends MainHistoryLocationState {
  defaultState?: DiscoverAppState;
}

/**
 * Carries the initial tab state from the navigation that supplied it to the tab initialization that
 * consumes it.
 *
 * Location state cannot simply be read from the history when it's needed: pushing the selected tab
 * ID to the URL goes through the hash history, which updates the URL with `window.location.replace`
 * and discards `window.history.state` in the process. Tab initialization therefore snapshots the
 * state up front and hands it over here, instead of writing it back to the history entry.
 */
export class InitialTabStateService {
  private pendingState: InitialTabState | undefined;

  /**
   * Snapshots the initial tab state for the navigation currently being handled. Must be called
   * before any URL update, since those discard the location state. A capture with no consumer is
   * superseded by the next one.
   */
  capture(initialTabState: InitialTabState | undefined) {
    this.pendingState = initialTabState;
  }

  /**
   * Returns the snapshotted initial tab state and clears it, so it's applied only to the tab it was
   * captured for.
   */
  consume(): InitialTabState | undefined {
    const initialTabState = this.pendingState;
    this.pendingState = undefined;
    return initialTabState;
  }
}
