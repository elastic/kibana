/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  internalStateSlice,
  type InternalStateThunkActionCreator,
  type InternalStateDispatch,
} from '../internal_state';
import type { DiscoverInternalState } from '../types';
import { initializeTabs, clearAllTabs } from './tabs';

export const undoDiscoverSessionChangesAndReloadTabs: InternalStateThunkActionCreator =
  () => (dispatch: InternalStateDispatch, getState: () => DiscoverInternalState) => {
    const { persistedDiscoverSession } = getState();
    if (!persistedDiscoverSession) {
      return;
    }
    // First reset the session state
    dispatch(internalStateSlice.actions.undoDiscoverSessionChanges());

    // Get the current state after resetting

    if (persistedDiscoverSession) {
      // Clear all tabs and reinitialize with the persisted session
      dispatch(clearAllTabs());
      dispatch(
        initializeTabs({
          discoverSessionId: persistedDiscoverSession.id,
          shouldClearAllTabs: true,
        })
      );
    }
  };
