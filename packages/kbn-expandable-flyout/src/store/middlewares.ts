/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Action, Dispatch, MiddlewareAPI } from '@reduxjs/toolkit';
import { changePushVsOverlayAction } from './actions';
import { EXPANDABLE_FLYOUT_LOCAL_STORAGE, PUSH_VS_OVERLAY_LOCAL_STORAGE } from '../constants';

/**
 * Middleware to save the push vs overlay state to local storage
 */
export const savePushVsOverlayToLocalStorageMiddleware =
  (store: MiddlewareAPI) => (next: Dispatch) => (action: Action) => {
    if (!action.type || !action.type) {
      return next(action);
    }

    if (changePushVsOverlayAction.match(action) && action.payload.savedToLocalStorage) {
      localStorage.setItem(
        `${EXPANDABLE_FLYOUT_LOCAL_STORAGE}.${PUSH_VS_OVERLAY_LOCAL_STORAGE}.${action.payload.id}`,
        action.payload.type
      );
    }

    return next(action);
  };
