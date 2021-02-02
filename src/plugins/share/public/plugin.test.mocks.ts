/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { shareMenuRegistryMock } from './services/share_menu_registry.mock';
import { shareMenuManagerMock } from './services/share_menu_manager.mock';

export const registryMock = shareMenuRegistryMock.create();
export const managerMock = shareMenuManagerMock.create();
jest.doMock('./services', () => ({
  ShareMenuRegistry: jest.fn(() => registryMock),
  ShareMenuManager: jest.fn(() => managerMock),
}));
