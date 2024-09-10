/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Action, Dispatch, MiddlewareAPI } from '@reduxjs/toolkit';
import {
  changeInternalPercentagesAction,
  resetInternalPercentagesAction,
} from './internal_percentages_actions';

const expandableFlyoutLocalStorage = 'expandableFlyout';
const internalPercentagesLocalStorage = 'internalPercentage';

/**
 *
 */
export const internalPercentagesMiddleware =
  (store: MiddlewareAPI) => (next: Dispatch) => (action: Action) => {
    if (!action.type || !action.type) {
      return next(action);
    }

    if (action.type === changeInternalPercentagesAction.type) {
      localStorage.setItem(
        `${expandableFlyoutLocalStorage}.${internalPercentagesLocalStorage}.${action.payload.id}`,
        JSON.stringify({ left: action.payload.left, right: action.payload.right })
      );
    }

    if (action.type === resetInternalPercentagesAction.type && action.payload.savedToLocalStorage) {
      localStorage.removeItem(
        `${expandableFlyoutLocalStorage}.${internalPercentagesLocalStorage}.${action.payload.id}`
      );
    }

    return next(action);
  };
