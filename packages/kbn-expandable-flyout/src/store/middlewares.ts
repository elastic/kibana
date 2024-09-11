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
  COLLAPSED_WIDTH_LOCAL_STORAGE,
  EXPANDABLE_FLYOUT_LOCAL_STORAGE,
  EXPANDED_WIDTH_LOCAL_STORAGE,
  INTERNAL_PERCENTAGES_LOCAL_STORAGE,
  PUSH_VS_OVERLAY_LOCAL_STORAGE,
} from '../constants';
import {
  changeCollapsedWidthAction,
  changeExpandedWidthAction,
  changeInternalPercentagesAction,
  changePushVsOverlayAction,
  resetCollapsedWidthAction,
  resetExpandedWidthAction,
  resetInternalPercentagesAction,
} from './actions';

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
        `${EXPANDABLE_FLYOUT_LOCAL_STORAGE}.${PUSH_VS_OVERLAY_LOCAL_STORAGE}.${action.payload.id}`,
        action.payload.type
      );
    }

    return next(action);
  };

/**
 *
 */
export const widthsMiddleware = (store: MiddlewareAPI) => (next: Dispatch) => (action: Action) => {
  if (!action.type || !action.type) {
    return next(action);
  }

  if (action.type === changeCollapsedWidthAction.type && action.payload.savedToLocalStorage) {
    localStorage.setItem(
      `${EXPANDABLE_FLYOUT_LOCAL_STORAGE}.${COLLAPSED_WIDTH_LOCAL_STORAGE}.${action.payload.id}`,
      action.payload.width
    );
  }
  if (action.type === resetCollapsedWidthAction.type) {
    localStorage.removeItem(
      `${EXPANDABLE_FLYOUT_LOCAL_STORAGE}.${COLLAPSED_WIDTH_LOCAL_STORAGE}.${action.payload.id}`
    );
  }

  if (action.type === changeExpandedWidthAction.type && action.payload.savedToLocalStorage) {
    localStorage.setItem(
      `${EXPANDABLE_FLYOUT_LOCAL_STORAGE}.${EXPANDED_WIDTH_LOCAL_STORAGE}.${action.payload.id}`,
      action.payload.width
    );
  }
  if (action.type === resetExpandedWidthAction.type) {
    localStorage.removeItem(
      `${EXPANDABLE_FLYOUT_LOCAL_STORAGE}.${EXPANDED_WIDTH_LOCAL_STORAGE}.${action.payload.id}`
    );
  }

  return next(action);
};

/**
 *
 */
export const internalPercentagesMiddleware =
  (store: MiddlewareAPI) => (next: Dispatch) => (action: Action) => {
    if (!action.type || !action.type) {
      return next(action);
    }

    if (
      action.type === changeInternalPercentagesAction.type &&
      action.payload.savedToLocalStorage
    ) {
      localStorage.setItem(
        `${EXPANDABLE_FLYOUT_LOCAL_STORAGE}.${INTERNAL_PERCENTAGES_LOCAL_STORAGE}.${action.payload.id}`,
        JSON.stringify({ left: action.payload.left, right: action.payload.right })
      );
    }

    if (action.type === resetInternalPercentagesAction.type) {
      localStorage.removeItem(
        `${EXPANDABLE_FLYOUT_LOCAL_STORAGE}.${INTERNAL_PERCENTAGES_LOCAL_STORAGE}.${action.payload.id}`
      );
    }

    return next(action);
  };
