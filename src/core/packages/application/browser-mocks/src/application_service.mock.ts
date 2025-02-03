/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { History } from 'history';
import { BehaviorSubject, Subject } from 'rxjs';

import type { PublicMethodsOf } from '@kbn/utility-types';
import type { MountPoint } from '@kbn/core-mount-utils-browser';
import { capabilitiesServiceMock } from '@kbn/core-capabilities-browser-mocks';
import { themeServiceMock } from '@kbn/core-theme-browser-mocks';
import { scopedHistoryMock } from './scoped_history.mock';
import {
  ApplicationSetup,
  ApplicationStart,
  PublicAppInfo,
  AppMountParameters,
} from '@kbn/core-application-browser';
import type {
  ApplicationService,
  InternalApplicationStart,
  InternalApplicationSetup,
} from '@kbn/core-application-browser-internal';

type ApplicationServiceContract = PublicMethodsOf<ApplicationService>;

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
  const currentLocation$ = new Subject<string>();

  return {
    applications$: new BehaviorSubject<Map<string, PublicAppInfo>>(new Map()),
    currentAppId$: currentAppId$.asObservable(),
    currentLocation$: currentLocation$.asObservable(),
    capabilities: capabilitiesServiceMock.createStartContract().capabilities,
    navigateToApp: jest.fn(),
    navigateToUrl: jest.fn(),
    getUrlForApp: jest.fn(),
    isAppRegistered: jest.fn(),
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

const createInternalStartContractMock = (
  currentAppId?: string
): jest.Mocked<InternalApplicationStart> => {
  const currentAppId$ = currentAppId
    ? new BehaviorSubject<string | undefined>(currentAppId)
    : new Subject<string | undefined>();
  const currentLocation$ = new Subject<string>();

  return {
    applications$: new BehaviorSubject<Map<string, PublicAppInfo>>(new Map()),
    capabilities: capabilitiesServiceMock.createStartContract().capabilities,
    currentAppId$: currentAppId$.asObservable(),
    currentLocation$: currentLocation$.asObservable(),
    currentActionMenu$: new BehaviorSubject<MountPoint | undefined>(undefined),
    getComponent: jest.fn(),
    getUrlForApp: jest.fn(),
    isAppRegistered: jest.fn(),
    navigateToApp: jest.fn().mockImplementation((appId) => currentAppId$.next(appId)),
    navigateToUrl: jest.fn(),
    history: createHistoryMock(),
  };
};

const createAppMountParametersMock = (parts: Partial<AppMountParameters> = {}) => {
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
