/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Action, Dispatch, MiddlewareAPI } from '@reduxjs/toolkit';
import { changePushVsOverlayAction } from './push_vs_overlay_actions';

const expandableFlyoutLocalStorage = 'expandableFlyout';
const pushVsOverlayModeLocalStorage = 'pushVsOverlayMode';

/**
 *
 */
export const pushVsOverlayMiddleware =
  (store: MiddlewareAPI) => (next: Dispatch) => (action: Action) => {
    if (!action.type || !action.type) {
      return next(action);
    }

    if (action.type === changePushVsOverlayAction.type && action.payload.savedToLocalStorage) {
      localStorage.setItem(
        `${expandableFlyoutLocalStorage}.${pushVsOverlayModeLocalStorage}.${action.payload.id}`,
        action.payload.type
      );
    }

    return next(action);
  };
