/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject } from 'rxjs';
import type { SidebarStart, SidebarSetup, SidebarApp } from '@kbn/core-chrome-sidebar';

const DEFAULT_WIDTH = 400;

const createSetupContractMock = (): jest.Mocked<SidebarSetup> => {
  return {
    registerApp: jest.fn(),
  };
};

const createAppMock = <TParams = unknown>(): jest.Mocked<SidebarApp<TParams>> => {
  return {
    open: jest.fn(),
    close: jest.fn(),
    setParams: jest.fn(),
    getParams: jest.fn().mockReturnValue({} as TParams),
    getParams$: jest.fn().mockReturnValue(new BehaviorSubject<TParams>({} as TParams)),
    setAvailable: jest.fn(),
  };
};

const createStartContractMock = (): jest.Mocked<SidebarStart> => {
  return {
    // State
    isOpen$: jest.fn().mockReturnValue(new BehaviorSubject<boolean>(false)),
    isOpen: jest.fn().mockReturnValue(false),
    close: jest.fn(),
    getWidth$: jest.fn().mockReturnValue(new BehaviorSubject<number>(DEFAULT_WIDTH)),
    getWidth: jest.fn().mockReturnValue(DEFAULT_WIDTH),
    setWidth: jest.fn(),
    getCurrentAppId$: jest.fn().mockReturnValue(new BehaviorSubject<string | null>(null)),
    getCurrentAppId: jest.fn().mockReturnValue(null),
    // Registry
    hasApp: jest.fn().mockReturnValue(false),
    // App-bound API
    getApp: jest.fn().mockReturnValue(createAppMock()),
    getAppDefinition: jest.fn(),
  };
};

export const sidebarServiceMock = {
  createSetupContract: createSetupContractMock,
  createStartContract: createStartContractMock,
  createAppMock,
};
