/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { History } from 'history';
import { BehaviorSubject, Subject } from 'rxjs';

import type { MountPoint } from '../types';
import { capabilitiesServiceMock } from './capabilities/capabilities_service.mock';
import { themeServiceMock } from '../theme/theme_service.mock';
import { scopedHistoryMock } from './scoped_history.mock';
import {
  ApplicationSetup,
  InternalApplicationStart,
  ApplicationStart,
  InternalApplicationSetup,
  PublicAppInfo,
  AppMountParameters,
} from './types';
import { ApplicationServiceContract } from './test_types';

const createSetupContractMock = (): jest.Mocked<ApplicationSetup> => ({
  register: jest.fn(),
  registerAppUpdater: jest.fn(),
});

const createInternalSetupContractMock = (): jest.Mocked<InternalApplicationSetup> => ({
  register: jest.fn(),
  registerAppUpdater: jest.fn(),
});

const createStartContractMock = (): jest.Mocked<ApplicationStart> => {
  const currentAppId$ = new Subject<string | undefined>();

  return {
    applications$: new BehaviorSubject<Map<string, PublicAppInfo>>(new Map()),
    currentAppId$: currentAppId$.asObservable(),
    capabilities: capabilitiesServiceMock.createStartContract().capabilities,
    navigateToApp: jest.fn(),
    navigateToUrl: jest.fn(),
    getUrlForApp: jest.fn(),
    navigateToUrlSkipUnload: jest.fn(),
  };
};

const createHistoryMock = (): jest.Mocked<History> => {
  return {
    block: jest.fn(),
    createHref: jest.fn(),
    go: jest.fn(),
    goBack: jest.fn(),
    goForward: jest.fn(),
    listen: jest.fn(),
    push: jest.fn(),
    replace: jest.fn(),
    action: 'PUSH',
    length: 1,
    location: {
      pathname: '/',
      search: '',
      hash: '',
      key: '',
      state: undefined,
    },
  };
};

const createInternalStartContractMock = (): jest.Mocked<InternalApplicationStart> => {
  const currentAppId$ = new Subject<string | undefined>();

  return {
    applications$: new BehaviorSubject<Map<string, PublicAppInfo>>(new Map()),
    capabilities: capabilitiesServiceMock.createStartContract().capabilities,
    currentAppId$: currentAppId$.asObservable(),
    currentActionMenu$: new BehaviorSubject<MountPoint | undefined>(undefined),
    getComponent: jest.fn(),
    getUrlForApp: jest.fn(),
    navigateToApp: jest.fn().mockImplementation((appId) => currentAppId$.next(appId)),
    navigateToUrl: jest.fn(),
    navigateToUrlSkipUnload: jest.fn(),
    history: createHistoryMock(),
  };
};

const createAppMountParametersMock = (parts: Partial<AppMountParameters>) => {
  const mock: AppMountParameters = {
    element: document.createElement('div'),
    history: scopedHistoryMock.create(),
    appBasePath: '/app',
    onAppLeave: jest.fn(),
    setHeaderActionMenu: jest.fn(),
    theme$: themeServiceMock.createTheme$(),
    ...parts,
  };
  return mock;
};

const createMock = (): jest.Mocked<ApplicationServiceContract> => ({
  setup: jest.fn().mockReturnValue(createInternalSetupContractMock()),
  start: jest.fn().mockReturnValue(createInternalStartContractMock()),
  stop: jest.fn(),
});

export const applicationServiceMock = {
  create: createMock,
  createSetupContract: createSetupContractMock,
  createStartContract: createStartContractMock,
  createInternalSetupContract: createInternalSetupContractMock,
  createInternalStartContract: createInternalStartContractMock,
  createAppMountParameters: createAppMountParametersMock,
};
