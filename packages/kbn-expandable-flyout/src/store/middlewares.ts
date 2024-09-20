/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Action, Dispatch } from '@reduxjs/toolkit';
import {
  changeUserCollapsedWidthAction,
  changeUserExpandedWidthAction,
  changeUserSectionWidthsAction,
  changePushVsOverlayAction,
  resetAllUserChangedWidthsAction,
} from './actions';
import {
  USER_COLLAPSED_WIDTH_LOCAL_STORAGE,
  EXPANDABLE_FLYOUT_LOCAL_STORAGE,
  USER_SECTION_WIDTHS_LOCAL_STORAGE,
  PUSH_VS_OVERLAY_LOCAL_STORAGE,
  USER_EXPANDED_WIDTH_LOCAL_STORAGE,
} from '../constants';

/**
 * Middleware to save the push vs overlay state to local storage
 */
export const savePushVsOverlayToLocalStorageMiddleware =
  () => (next: Dispatch) => (action: Action) => {
    if (!action.type) {
      return next(action);
    }

    if (changePushVsOverlayAction.match(action) && action.payload.savedToLocalStorage) {
      const currentStringValue = localStorage.getItem(EXPANDABLE_FLYOUT_LOCAL_STORAGE);
      const currentJsonValue = currentStringValue ? JSON.parse(currentStringValue) : {};

      currentJsonValue[PUSH_VS_OVERLAY_LOCAL_STORAGE] = action.payload.type;

      localStorage.setItem(EXPANDABLE_FLYOUT_LOCAL_STORAGE, JSON.stringify(currentJsonValue));
    }

    return next(action);
  };

/**
 * Middleware to save the user collapsed and expanded flyout widths to local storage
 */
export const saveUserFlyoutWidthsToLocalStorageMiddleware =
  () => (next: Dispatch) => (action: Action) => {
    if (!action.type) {
      return next(action);
    }

    const currentStringValue = localStorage.getItem(EXPANDABLE_FLYOUT_LOCAL_STORAGE);
    const currentJsonValue = currentStringValue ? JSON.parse(currentStringValue) : {};

    if (changeUserCollapsedWidthAction.match(action) && action.payload.savedToLocalStorage) {
      currentJsonValue[USER_COLLAPSED_WIDTH_LOCAL_STORAGE] = action.payload.width;

      localStorage.setItem(EXPANDABLE_FLYOUT_LOCAL_STORAGE, JSON.stringify(currentJsonValue));
    }

    if (changeUserExpandedWidthAction.match(action) && action.payload.savedToLocalStorage) {
      currentJsonValue[USER_EXPANDED_WIDTH_LOCAL_STORAGE] = action.payload.width;

      localStorage.setItem(EXPANDABLE_FLYOUT_LOCAL_STORAGE, JSON.stringify(currentJsonValue));
    }

    return next(action);
  };

/**
 * Middleware to save the user left and right section widths to local storage
 */
export const saveUserSectionWidthsToLocalStorageMiddleware =
  () => (next: Dispatch) => (action: Action) => {
    if (!action.type) {
      return next(action);
    }

    if (changeUserSectionWidthsAction.match(action) && action.payload.savedToLocalStorage) {
      const currentStringValue = localStorage.getItem(EXPANDABLE_FLYOUT_LOCAL_STORAGE);
      const currentJsonValue = currentStringValue ? JSON.parse(currentStringValue) : {};

      currentJsonValue[USER_SECTION_WIDTHS_LOCAL_STORAGE] = {
        left: action.payload.left,
        right: action.payload.right,
      };

      localStorage.setItem(EXPANDABLE_FLYOUT_LOCAL_STORAGE, JSON.stringify(currentJsonValue));
    }

    return next(action);
  };

/**
 * Middleware to save the user left and right section widths to local storage
 */
export const clearAllUserWidthsFromLocalStorageMiddleware =
  () => (next: Dispatch) => (action: Action) => {
    if (!action.type) {
      return next(action);
    }

    if (resetAllUserChangedWidthsAction.match(action)) {
      const currentStringValue = localStorage.getItem(EXPANDABLE_FLYOUT_LOCAL_STORAGE);
      const currentJsonValue = currentStringValue ? JSON.parse(currentStringValue) : {};

      delete currentJsonValue[USER_COLLAPSED_WIDTH_LOCAL_STORAGE];
      delete currentJsonValue[USER_EXPANDED_WIDTH_LOCAL_STORAGE];
      delete currentJsonValue[USER_SECTION_WIDTHS_LOCAL_STORAGE];

      localStorage.setItem(EXPANDABLE_FLYOUT_LOCAL_STORAGE, JSON.stringify(currentJsonValue));
    }

    return next(action);
  };
