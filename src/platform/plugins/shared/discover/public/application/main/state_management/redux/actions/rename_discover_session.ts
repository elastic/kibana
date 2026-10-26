/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { internalStateSlice } from '../internal_state';
import { createInternalStateAsyncThunk } from '../utils';
import { rememberDiscoverSession } from '../../../../../services/discover_recently_accessed_service';

export interface RenameDiscoverSessionThunkParams {
  newTitle: string;
}

/**
 * Renames an already saved Discover session by saving the latest saved version under the new title,
 * without persisting the current tabs' unsaved changes. Unsaved sessions are handled upstream by
 * opening the save session modal instead.
 */
export const renameDiscoverSession = createInternalStateAsyncThunk(
  'internalState/renameDiscoverSession',
  async (
    { newTitle }: RenameDiscoverSessionThunkParams,
    { dispatch, getState, extra: { services, customizationContext } }
  ) => {
    const { persistedDiscoverSession } = getState();

    if (!persistedDiscoverSession) {
      return;
    }

    const { id } = persistedDiscoverSession;

    // Rename the latest saved version, so changes saved elsewhere since this session was opened
    // are kept and the unsaved changes of the current tabs stay unsaved
    const {
      session: { description, tabs, tags, version },
    } = await services.discoverSessionService.get(id);
    const isLatestSavedVersion = version === persistedDiscoverSession.version;
    const discoverSession = await services.discoverSessionService.save(
      { id, title: newTitle, description, tabs, tags },
      { copyOnSave: false }
    );

    if (!discoverSession) {
      return;
    }

    if (customizationContext.displayMode === 'standalone') {
      rememberDiscoverSession(services.core.http, services.chrome, discoverSession);
    }

    dispatch(
      internalStateSlice.actions.setPersistedDiscoverSession({
        ...persistedDiscoverSession,
        title: newTitle,
        // A rename must not acknowledge tab changes saved elsewhere since this page was opened.
        version: isLatestSavedVersion ? discoverSession.version : persistedDiscoverSession.version,
      })
    );
  }
);
