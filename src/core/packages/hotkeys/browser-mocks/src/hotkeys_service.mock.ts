/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EMPTY } from 'rxjs';
import type { DeeplyMockedKeys } from '@kbn/utility-types-jest';
import type {
  AppScopedHotkeys,
  HotkeyHandle,
  HotkeysSetup,
  HotkeysStart,
} from '@kbn/core-hotkeys-browser';
import { lazyObject } from '@kbn/lazy-object';

const createHotkeyHandleMock = (): jest.Mocked<HotkeyHandle> => ({
  id: 'mock-hotkey',
  update: jest.fn(),
  unregister: jest.fn(),
});

const createAppScopedHotkeysMock = (): jest.Mocked<AppScopedHotkeys> => ({
  register: jest.fn().mockImplementation(createHotkeyHandleMock),
  registerMany: jest.fn().mockReturnValue(jest.fn()),
  dispose: jest.fn(),
});

const createSetupContractMock = () => {
  const setupContract: DeeplyMockedKeys<HotkeysSetup> = lazyObject({});
  return setupContract;
};

const createStartContractMock = () => {
  const startContract: DeeplyMockedKeys<HotkeysStart> = lazyObject({
    register: jest.fn().mockImplementation(createHotkeyHandleMock),
    registerMany: jest.fn().mockReturnValue(jest.fn()),
    forApp: jest.fn().mockImplementation(createAppScopedHotkeysMock),
    getRegistrations$: jest.fn().mockReturnValue(EMPTY),
  });
  return startContract;
};

/**
 * This is declared internally to avoid a circular dependency issue
 */
export interface HotkeysServiceContract {
  setup: typeof createSetupContractMock;
  start: () => HotkeysStart;
  stop: () => void;
}

const createMock = () => {
  const mocked: jest.Mocked<HotkeysServiceContract> = lazyObject({
    setup: jest.fn().mockReturnValue(createSetupContractMock()),
    start: jest.fn().mockReturnValue(createStartContractMock()),
    stop: jest.fn(),
  });

  return mocked;
};

export const hotkeysServiceMock = {
  create: createMock,
  createSetupContract: createSetupContractMock,
  createStartContract: createStartContractMock,
};
