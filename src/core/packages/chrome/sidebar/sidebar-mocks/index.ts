/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject } from 'rxjs';
import type {
  SidebarApp,
  SidebarAppConfig,
  SidebarSetup,
  SidebarStart,
} from '@kbn/core-chrome-sidebar';

const DEFAULT_WIDTH = 400;

const createSetupContractMock = (): jest.Mocked<SidebarSetup> => {
  const registerApp = jest.fn(
    <TState = undefined, TActions = undefined>(_app: SidebarAppConfig<TState, TActions>) =>
      jest.fn()
  ) as jest.MockedFunction<SidebarSetup['registerApp']>;

  return {
    registerApp,
  };
};

/** Create a mock for SidebarApp with all properties */
const createAppMock = <TState = undefined, TActions = undefined>(): jest.Mocked<
  SidebarApp<TState, TActions>
> => {
  return {
    open: jest.fn(),
    close: jest.fn(),
    actions: {} as unknown as jest.Mocked<SidebarApp<TState, TActions>>['actions'],
    getState: jest.fn().mockReturnValue({} as TState),
    getState$: jest.fn().mockReturnValue(new BehaviorSubject<TState>({} as TState)),
    getStatus: jest.fn().mockReturnValue('available'),
    getStatus$: jest.fn().mockReturnValue(new BehaviorSubject('available')),
  };
};

const createStartContractMock = (): jest.Mocked<SidebarStart> => {
  return {
    isOpen$: jest.fn().mockReturnValue(new BehaviorSubject<boolean>(false)),
    isOpen: jest.fn().mockReturnValue(false),
    close: jest.fn(),
    getWidth$: jest.fn().mockReturnValue(new BehaviorSubject<number>(DEFAULT_WIDTH)),
    getWidth: jest.fn().mockReturnValue(DEFAULT_WIDTH),
    setWidth: jest.fn(),
    getCurrentAppId$: jest.fn().mockReturnValue(new BehaviorSubject<string | null>(null)),
    getCurrentAppId: jest.fn().mockReturnValue(null),
    hasApp: jest.fn().mockReturnValue(false),
    getApp: jest.fn().mockReturnValue(createAppMock()),
    getAppDefinition: jest.fn(),
  };
};

export const sidebarServiceMock = {
  createSetupContract: createSetupContractMock,
  createStartContract: createStartContractMock,
  createAppMock,
};
