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
  changeCollapsedWidthAction,
  changeExpandedWidthAction,
  resetCollapsedWidthAction,
  resetExpandedWidthAction,
} from './widths_actions';

const expandableFlyoutLocalStorage = 'expandableFlyout';
const collapsedLocalStorage = 'collapsedResizedWidth';
const expandedLocalStorage = 'expandedResizedWidth';

/**
 *
 */
export const widthsMiddleware = (store: MiddlewareAPI) => (next: Dispatch) => (action: Action) => {
  if (!action.type || !action.type) {
    return next(action);
  }

  if (action.type === changeCollapsedWidthAction.type && action.payload.savedToLocalStorage) {
    localStorage.setItem(
      `${expandableFlyoutLocalStorage}.${collapsedLocalStorage}.${action.payload.id}`,
      action.payload.width
    );
  }
  if (action.type === resetCollapsedWidthAction.type) {
    localStorage.removeItem(
      `${expandableFlyoutLocalStorage}.${collapsedLocalStorage}.${action.payload.id}`
    );
  }

  if (action.type === changeExpandedWidthAction.type && action.payload.savedToLocalStorage) {
    localStorage.setItem(
      `${expandableFlyoutLocalStorage}.${expandedLocalStorage}.${action.payload.id}`,
      action.payload.width
    );
  }
  if (action.type === resetExpandedWidthAction.type) {
    localStorage.removeItem(
      `${expandableFlyoutLocalStorage}.${expandedLocalStorage}.${action.payload.id}`
    );
  }

  return next(action);
};
