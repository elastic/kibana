/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import type { AppState } from '../../common';
import type { AppStateServiceStart } from './app_state_service';

export const mockAppStateService = {
  createStart: (): jest.Mocked<AppStateServiceStart> => {
    return { getState: jest.fn() };
  },
  createAppState: (appState: Partial<AppState> = {}) => ({
    insecureClusterAlert: { displayAlert: false },
    anonymousAccess: { isEnabled: false, accessURLParameters: null },
    ...appState,
  }),
};
