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
  changePushVsOverlay = 'change_push_overlay',
}

export const changePushVsOverlayAction = createAction<{
  /**
   *
   */
  type: 'push' | 'overlay';
  /**
   * Unique identifier for the flyout (either the urlKey or 'memory')
   */
  id: string;
  /**
   *
   */
  savedToLocalStorage: boolean;
}>(ActionType.changePushVsOverlay);
