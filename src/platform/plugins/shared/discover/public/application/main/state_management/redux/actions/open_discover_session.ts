/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createInternalStateAsyncThunk } from '../utils';
import { addLog } from '../../../../../utils/add_log';
import { resetDiscoverSession } from './reset_discover_session';

export const openDiscoverSession = createInternalStateAsyncThunk(
  'internalState/openDiscoverSession',
  async (
    {
      discoverSessionId,
    }: {
      discoverSessionId: string;
    },
    { dispatch, getState, extra: { services } }
  ) => {
    const { persistedDiscoverSession } = getState();

    addLog('openDiscoverSession', discoverSessionId);
    if (persistedDiscoverSession?.id === discoverSessionId) {
      addLog('[openDiscoverSession] undo changes since saved search did not change');
      await dispatch(resetDiscoverSession()).unwrap();
    } else {
      addLog('[openDiscoverSession] open view URL');
      services.locator.navigate({
        savedSearchId: discoverSessionId,
      });
    }
  }
);
