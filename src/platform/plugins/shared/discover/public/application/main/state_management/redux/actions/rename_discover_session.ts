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
 * Renames the Discover session: saved sessions are saved right away without their unsaved tab
 * changes, while unsaved sessions keep the title as a draft until they are saved.
 */
export const renameDiscoverSession = createInternalStateAsyncThunk(
  'internalState/renameDiscoverSession',
  async (
    { newTitle }: RenameDiscoverSessionThunkParams,
    { dispatch, getState, extra: { services, customizationContext } }
  ) => {
    const { persistedDiscoverSession } = getState();

    if (!persistedDiscoverSession) {
      dispatch(internalStateSlice.actions.setDraftSessionTitle(newTitle));
      return;
    }

    const { id } = persistedDiscoverSession;

    // Rename the latest saved version, so changes saved elsewhere since this session was opened
    // are kept and the unsaved changes of the current tabs stay unsaved
    const {
      session: { description, tabs, tags, version: latestVersion },
    } = await services.discoverSessionService.get(id);
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

    // When the session was saved elsewhere, the local tabs keep the opened version, so a reload
    // still restores the newer saved tabs
    const isSavedElsewhere = latestVersion !== persistedDiscoverSession.version;

    dispatch(
      internalStateSlice.actions.setPersistedDiscoverSession({
        ...persistedDiscoverSession,
        title: newTitle,
        version: isSavedElsewhere ? persistedDiscoverSession.version : discoverSession.version,
      })
    );
  }
);
