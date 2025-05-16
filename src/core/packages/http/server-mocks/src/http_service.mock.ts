/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Server } from '@hapi/hapi';
import type { PublicMethodsOf } from '@kbn/utility-types';
import { configMock } from '@kbn/config-mocks';
import type {
  RequestHandlerContextBase,
  OnPreRoutingToolkit,
  AuthToolkit,
  OnPostAuthToolkit,
  OnPreAuthToolkit,
  OnPreResponseToolkit,
  IAuthHeadersStorage,
  HttpServicePreboot,
  HttpServiceSetup,
  HttpServiceStart,
  IStaticAssets,
} from '@kbn/core-http-server';
import { AuthStatus } from '@kbn/core-http-server';
import { mockRouter, RouterMock } from '@kbn/core-http-router-server-mocks';

import { CspConfig, ExternalUrlConfig, config } from '@kbn/core-http-server-internal';
import type {
  HttpService,
  InternalHttpServicePreboot,
  InternalHttpServiceSetup,
  InternalHttpServiceStart,
} from '@kbn/core-http-server-internal';
import { sessionStorageMock } from './cookie_session_storage.mocks';

type BasePathMocked = jest.Mocked<InternalHttpServiceSetup['basePath']>;
type InternalStaticAssetsMocked = jest.Mocked<InternalHttpServiceSetup['staticAssets']>;
type StaticAssetsMocked = jest.Mocked<IStaticAssets>;
type AuthMocked = jest.Mocked<InternalHttpServiceSetup['auth']>;

export type HttpServicePrebootMock = jest.Mocked<HttpServicePreboot>;
export type InternalHttpServicePrebootMock = jest.Mocked<
  Omit<InternalHttpServicePreboot, 'basePath' | 'staticAssets'>
> & { basePath: BasePathMocked; staticAssets: InternalStaticAssetsMocked };
export type HttpServiceSetupMock<
  ContextType extends RequestHandlerContextBase = RequestHandlerContextBase
> = jest.Mocked<Omit<HttpServiceSetup<ContextType>, 'basePath' | 'createRouter'>> & {
  basePath: BasePathMocked;
  staticAssets: StaticAssetsMocked;
  createRouter: jest.MockedFunction<() => RouterMock>;
};
export type InternalHttpServiceSetupMock = jest.Mocked<
  Omit<
    InternalHttpServiceSetup,
    'basePath' | 'staticAssets' | 'createRouter' | 'authRequestHeaders' | 'auth'
  >
> & {
  auth: AuthMocked;
  basePath: BasePathMocked;
  staticAssets: InternalStaticAssetsMocked;
  createRouter: jest.MockedFunction<(path: string) => RouterMock>;
  authRequestHeaders: jest.Mocked<IAuthHeadersStorage>;
};
export type HttpServiceStartMock = jest.Mocked<HttpServiceStart> & {
  basePath: BasePathMocked;
  staticAssets: StaticAssetsMocked;
};
export type InternalHttpServiceStartMock = jest.Mocked<InternalHttpServiceStart> & {
  basePath: BasePathMocked;
  staticAssets: InternalStaticAssetsMocked;
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

const createInternalStaticAssetsMock = (
  basePath: BasePathMocked,
  cdnUrl: undefined | string = undefined
): InternalStaticAssetsMocked => ({
  isUsingCdn: jest.fn().mockReturnValue(!!cdnUrl),
  getHrefBase: jest.fn().mockReturnValue(cdnUrl ?? basePath.serverBasePath),
  getPluginAssetHref: jest.fn().mockReturnValue(cdnUrl ?? basePath.serverBasePath),
  getPluginServerPath: jest.fn((v, _) => v),
  prependServerPath: jest.fn((v) => v),
  prependPublicUrl: jest.fn((v) => v),
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

interface CreateMockArgs {
  cdnUrl?: string;
}

const createInternalPrebootContractMock = (args: CreateMockArgs = {}) => {
  const basePath = createBasePathMock();
  const mock: InternalHttpServicePrebootMock = {
    registerRoutes: jest.fn(),
    registerRouteHandlerContext: jest.fn(),
    registerStaticDir: jest.fn(),
    basePath,
    staticAssets: createInternalStaticAssetsMock(basePath, args.cdnUrl),
    csp: CspConfig.DEFAULT,
    prototypeHardening: false,
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
  const basePath = createBasePathMock();
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
    getDeprecatedRoutes: jest.fn(),
    getRegisteredDeprecatedApis: jest.fn(),
    registerOnPostValidation: jest.fn(),
    registerAuth: jest.fn(),
    registerOnPostAuth: jest.fn(),
    registerRouteHandlerContext: jest.fn(),
    registerOnPreResponse: jest.fn(),
    createRouter: jest.fn().mockImplementation(() => mockRouter.create({})),
    registerStaticDir: jest.fn(),
    basePath,
    csp: CspConfig.DEFAULT,
    prototypeHardening: false,
    staticAssets: createInternalStaticAssetsMock(basePath),
    externalUrl: ExternalUrlConfig.DEFAULT,
    auth: createAuthMock(),
    authRequestHeaders: createAuthHeaderStorageMock(),
    getServerInfo: jest.fn(),
    registerRouterAfterListening: jest.fn(),
    rateLimiter: config.schema.getSchema().extract('rateLimiter').validate({}).value,
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

const createSetupContractMock = <
  ContextType extends RequestHandlerContextBase = RequestHandlerContextBase
>() => {
  const internalMock = createInternalSetupContractMock();

  const mock: HttpServiceSetupMock<ContextType> = {
    createCookieSessionStorageFactory: internalMock.createCookieSessionStorageFactory,
    registerOnPreRouting: internalMock.registerOnPreRouting,
    registerOnPreAuth: jest.fn(),
    getDeprecatedRoutes: jest.fn(),
    registerAuth: internalMock.registerAuth,
    registerOnPostAuth: internalMock.registerOnPostAuth,
    registerOnPreResponse: internalMock.registerOnPreResponse,
    basePath: internalMock.basePath,
    csp: CspConfig.DEFAULT,
    createRouter: jest.fn(),
    registerRouteHandlerContext: jest.fn(),
    getServerInfo: internalMock.getServerInfo,
    staticAssets: {
      getPluginAssetHref: jest.fn().mockImplementation((assetPath: string) => assetPath),
      prependPublicUrl: jest.fn().mockImplementation((pathname: string) => pathname),
    },
  };

  mock.createRouter.mockImplementation(() => internalMock.createRouter(''));

  return mock;
};

const createStartContractMock = () => {
  const mock: HttpServiceStartMock = {
    auth: createAuthMock(),
    basePath: createBasePathMock(),
    getServerInfo: jest.fn(),
    staticAssets: {
      getPluginAssetHref: jest.fn().mockImplementation((assetPath: string) => assetPath),
      prependPublicUrl: jest.fn().mockImplementation((pathname: string) => pathname),
    },
  };

  return mock;
};

const createInternalStartContractMock = () => {
  const basePath = createBasePathMock();
  const mock: InternalHttpServiceStartMock = {
    ...createStartContractMock(),
    staticAssets: createInternalStaticAssetsMock(basePath),
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
  authzResultNext: jest.fn(),
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
