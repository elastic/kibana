/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createAction } from '@reduxjs/toolkit';

export enum ActionType {
  changeCollapsedWidth = 'change_collapsed_width',
  resetCollapsedWidth = 'reset_collapsed_width',
  changeExpandedWidth = 'change_expanded_width',
  resetExpandedWidth = 'reset_expanded_width',
}

export const changeCollapsedWidthAction = createAction<{
  /**
   *
   */
  width: number;
  /**
   * Unique identifier for the flyout (either the urlKey or 'memory')
   */
  id: string;
  /**
   *
   */
  savedToLocalStorage: boolean;
}>(ActionType.changeCollapsedWidth);

export const resetCollapsedWidthAction = createAction<{
  /**
   * Unique identifier for the flyout (either the urlKey or 'memory')
   */
  id: string;
}>(ActionType.resetCollapsedWidth);

export const changeExpandedWidthAction = createAction<{
  /**
   *
   */
  width: number;
  /**
   * Unique identifier for the flyout (either the urlKey or 'memory')
   */
  id: string;
  /**
   *
   */
  savedToLocalStorage: boolean;
}>(ActionType.changeExpandedWidth);

export const resetExpandedWidthAction = createAction<{
  /**
   * Unique identifier for the flyout (either the urlKey or 'memory')
   */
  id: string;
}>(ActionType.resetExpandedWidth);
