/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Server } from '@hapi/hapi';
import type { PublicMethodsOf } from '@kbn/utility-types';

import { CspConfig } from '../csp';
import { mockRouter, RouterMock } from './router/router.mock';
import {
  InternalHttpServicePreboot,
  HttpServicePreboot,
  InternalHttpServiceSetup,
  HttpServiceSetup,
  HttpServiceStart,
  InternalHttpServiceStart,
} from './types';
import { HttpService } from './http_service';
import { AuthStatus } from './auth_state_storage';
import { OnPreRoutingToolkit } from './lifecycle/on_pre_routing';
import { AuthToolkit } from './lifecycle/auth';
import { sessionStorageMock } from './cookie_session_storage.mocks';
import { OnPostAuthToolkit } from './lifecycle/on_post_auth';
import { OnPreAuthToolkit } from './lifecycle/on_pre_auth';
import { OnPreResponseToolkit } from './lifecycle/on_pre_response';
import { configMock } from '../config/mocks';
import { ExternalUrlConfig } from '../external_url';
import type { IAuthHeadersStorage } from './auth_headers_storage';

type BasePathMocked = jest.Mocked<InternalHttpServiceSetup['basePath']>;
type AuthMocked = jest.Mocked<InternalHttpServiceSetup['auth']>;

export type HttpServicePrebootMock = jest.Mocked<HttpServicePreboot>;
export type InternalHttpServicePrebootMock = jest.Mocked<
  Omit<InternalHttpServicePreboot, 'basePath'>
> & { basePath: BasePathMocked };
export type HttpServiceSetupMock = jest.Mocked<
  Omit<HttpServiceSetup, 'basePath' | 'createRouter'>
> & {
  basePath: BasePathMocked;
  createRouter: jest.MockedFunction<() => RouterMock>;
};
export type InternalHttpServiceSetupMock = jest.Mocked<
  Omit<InternalHttpServiceSetup, 'basePath' | 'createRouter' | 'authRequestHeaders'>
> & {
  basePath: BasePathMocked;
  createRouter: jest.MockedFunction<(path: string) => RouterMock>;
  authRequestHeaders: jest.Mocked<IAuthHeadersStorage>;
};
export type HttpServiceStartMock = jest.Mocked<HttpServiceStart> & {
  basePath: BasePathMocked;
};
export type InternalHttpServiceStartMock = jest.Mocked<InternalHttpServiceStart> & {
  basePath: BasePathMocked;
};

const createBasePathMock = (
  serverBasePath = '/mock-server-basepath',
  publicBaseUrl = 'http://myhost.com/mock-server-basepath'
): BasePathMocked => ({
  serverBasePath,
  publicBaseUrl,
  get: jest.fn().mockReturnValue(serverBasePath),
  set: jest.fn(),
  prepend: jest.fn(),
  remove: jest.fn(),
});

const createAuthMock = () => {
  const mock: AuthMocked = {
    get: jest.fn(),
    isAuthenticated: jest.fn(),
  };
  mock.get.mockReturnValue({ status: AuthStatus.authenticated, state: {} });
  mock.isAuthenticated.mockReturnValue(true);
  return mock;
};

const createAuthHeaderStorageMock = () => {
  const mock: jest.Mocked<IAuthHeadersStorage> = {
    set: jest.fn(),
    get: jest.fn(),
  };
  return mock;
};

const createInternalPrebootContractMock = () => {
  const mock: InternalHttpServicePrebootMock = {
    registerRoutes: jest.fn(),
    registerRouteHandlerContext: jest.fn(),
    registerStaticDir: jest.fn(),
    basePath: createBasePathMock(),
    csp: CspConfig.DEFAULT,
    externalUrl: ExternalUrlConfig.DEFAULT,
    auth: createAuthMock(),
    getServerInfo: jest.fn(),
    server: {
      name: 'http-preboot-server-test',
      version: 'kibana',
      route: jest.fn(),
      start: jest.fn(),
      stop: jest.fn(),
      config: jest.fn().mockReturnValue(configMock.create()),
      // @ts-expect-error somehow it thinks that `Server` isn't a `Construtable`
    } as unknown as jest.MockedClass<Server>,
  };
  return mock;
};

const createPrebootContractMock = () => {
  const internalMock = createInternalPrebootContractMock();

  const mock: HttpServicePrebootMock = {
    registerRoutes: internalMock.registerRoutes,
    basePath: createBasePathMock(),
    getServerInfo: jest.fn(),
  };

  return mock;
};

const createInternalSetupContractMock = () => {
  const mock: InternalHttpServiceSetupMock = {
    // we can mock other hapi server methods when we need it
    server: {
      name: 'http-server-test',
      version: 'kibana',
      route: jest.fn(),
      start: jest.fn(),
      stop: jest.fn(),
      config: jest.fn().mockReturnValue(configMock.create()),
      // @ts-expect-error somehow it thinks that `Server` isn't a `Construtable`
    } as unknown as jest.MockedClass<Server>,
    createCookieSessionStorageFactory: jest.fn(),
    registerOnPreRouting: jest.fn(),
    registerOnPreAuth: jest.fn(),
    registerAuth: jest.fn(),
    registerOnPostAuth: jest.fn(),
    registerRouteHandlerContext: jest.fn(),
    registerOnPreResponse: jest.fn(),
    createRouter: jest.fn().mockImplementation(() => mockRouter.create({})),
    registerStaticDir: jest.fn(),
    basePath: createBasePathMock(),
    csp: CspConfig.DEFAULT,
    externalUrl: ExternalUrlConfig.DEFAULT,
    auth: createAuthMock(),
    authRequestHeaders: createAuthHeaderStorageMock(),
    getServerInfo: jest.fn(),
    registerPrebootRoutes: jest.fn(),
    registerRouterAfterListening: jest.fn(),
  };
  mock.createCookieSessionStorageFactory.mockResolvedValue(sessionStorageMock.createFactory());
  mock.createRouter.mockImplementation(() => mockRouter.create());
  mock.authRequestHeaders.get.mockReturnValue({ authorization: 'authorization-header' });
  mock.getServerInfo.mockReturnValue({
    hostname: 'localhost',
    name: 'kibana',
    port: 80,
    protocol: 'http',
  });
  return mock;
};

const createSetupContractMock = () => {
  const internalMock = createInternalSetupContractMock();

  const mock: HttpServiceSetupMock = {
    createCookieSessionStorageFactory: internalMock.createCookieSessionStorageFactory,
    registerOnPreRouting: internalMock.registerOnPreRouting,
    registerOnPreAuth: jest.fn(),
    registerAuth: internalMock.registerAuth,
    registerOnPostAuth: internalMock.registerOnPostAuth,
    registerOnPreResponse: internalMock.registerOnPreResponse,
    basePath: internalMock.basePath,
    csp: CspConfig.DEFAULT,
    createRouter: jest.fn(),
    registerRouteHandlerContext: jest.fn(),
    getServerInfo: internalMock.getServerInfo,
  };

  mock.createRouter.mockImplementation(() => internalMock.createRouter(''));

  return mock;
};

const createStartContractMock = () => {
  const mock: HttpServiceStartMock = {
    auth: createAuthMock(),
    basePath: createBasePathMock(),
    getServerInfo: jest.fn(),
  };

  return mock;
};

const createInternalStartContractMock = () => {
  const mock: InternalHttpServiceStartMock = {
    ...createStartContractMock(),
    isListening: jest.fn(),
  };

  mock.isListening.mockReturnValue(true);

  return mock;
};

type HttpServiceContract = PublicMethodsOf<HttpService>;

const createHttpServiceMock = () => {
  const mocked: jest.Mocked<HttpServiceContract> = {
    preboot: jest.fn(),
    setup: jest.fn(),
    getStartContract: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
  };
  mocked.preboot.mockResolvedValue(createInternalPrebootContractMock());
  mocked.setup.mockResolvedValue(createInternalSetupContractMock());
  mocked.getStartContract.mockReturnValue(createInternalStartContractMock());
  mocked.start.mockResolvedValue(createInternalStartContractMock());
  return mocked;
};

const createOnPreAuthToolkitMock = (): jest.Mocked<OnPreAuthToolkit> => ({
  next: jest.fn(),
});

const createOnPostAuthToolkitMock = (): jest.Mocked<OnPostAuthToolkit> => ({
  next: jest.fn(),
});

const createOnPreRoutingToolkitMock = (): jest.Mocked<OnPreRoutingToolkit> => ({
  next: jest.fn(),
  rewriteUrl: jest.fn(),
});

const createAuthToolkitMock = (): jest.Mocked<AuthToolkit> => ({
  authenticated: jest.fn(),
  notHandled: jest.fn(),
  redirected: jest.fn(),
});

const createOnPreResponseToolkitMock = (): jest.Mocked<OnPreResponseToolkit> => ({
  render: jest.fn(),
  next: jest.fn(),
});

export const httpServiceMock = {
  create: createHttpServiceMock,
  createBasePath: createBasePathMock,
  createAuth: createAuthMock,
  createInternalPrebootContract: createInternalPrebootContractMock,
  createPrebootContract: createPrebootContractMock,
  createInternalSetupContract: createInternalSetupContractMock,
  createSetupContract: createSetupContractMock,
  createInternalStartContract: createInternalStartContractMock,
  createStartContract: createStartContractMock,
  createOnPreAuthToolkit: createOnPreAuthToolkitMock,
  createOnPostAuthToolkit: createOnPostAuthToolkitMock,
  createOnPreResponseToolkit: createOnPreResponseToolkitMock,
  createOnPreRoutingToolkit: createOnPreRoutingToolkitMock,
  createAuthToolkit: createAuthToolkitMock,
  createAuthHeaderStorage: createAuthHeaderStorageMock,
  createRouter: mockRouter.create,
};
