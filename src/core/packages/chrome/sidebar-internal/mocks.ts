/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject } from 'rxjs';
import type { SidebarStart, SidebarSetup } from '@kbn/core-chrome-sidebar';

const DEFAULT_WIDTH = 400;

const createSetupContractMock = (): jest.Mocked<SidebarSetup> => {
  return {
    registerApp: jest.fn(),
  };
};

const createStartContractMock = (): jest.Mocked<SidebarStart> => {
  return {
    // State
    isOpen$: jest.fn().mockReturnValue(new BehaviorSubject<boolean>(false)),
    isOpen: jest.fn().mockReturnValue(false),
    open: jest.fn(),
    close: jest.fn(),
    getWidth$: jest.fn().mockReturnValue(new BehaviorSubject<number>(DEFAULT_WIDTH)),
    getWidth: jest.fn().mockReturnValue(DEFAULT_WIDTH),
    setWidth: jest.fn(),
    getCurrentAppId$: jest.fn().mockReturnValue(new BehaviorSubject<string | null>(null)),
    getCurrentAppId: jest.fn().mockReturnValue(null),
    // App state
    getParams$: jest.fn().mockReturnValue(new BehaviorSubject<unknown>({})),
    getParams: jest.fn().mockReturnValue({}),
    setParams: jest.fn(),
    // Registry
    setAvailable: jest.fn(),
    getAvailableApps$: jest.fn().mockReturnValue(new BehaviorSubject<string[]>([])),
    hasApp: jest.fn().mockReturnValue(false),
    getApp: jest.fn(),
  };
};

export const sidebarServiceMock = {
  createSetupContract: createSetupContractMock,
  createStartContract: createStartContractMock,
};
