/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { PluginOpaqueId } from '@kbn/core-base-common';
import type {
  IRouter,
  RequestHandlerContextBase,
  IContextProvider,
  IAuthHeadersStorage,
  IContextContainer,
  HttpServiceSetup,
  HttpServiceStart,
} from '@kbn/core-http-server';
import { HttpServerSetup } from './http_server';
import { ExternalUrlConfig } from './external_url';

/** @internal */
export interface InternalHttpServicePreboot
  extends Pick<
    InternalHttpServiceSetup,
    | 'auth'
    | 'csp'
    | 'basePath'
    | 'externalUrl'
    | 'registerStaticDir'
    | 'registerRouteHandlerContext'
    | 'server'
    | 'getServerInfo'
  > {
  registerRoutes<
    DefaultRequestHandlerType extends RequestHandlerContextBase = RequestHandlerContextBase
  >(
    path: string,
    callback: (router: IRouter<DefaultRequestHandlerType>) => void
  ): void;
}

/** @internal */
export interface InternalHttpServiceSetup
  extends Omit<HttpServiceSetup, 'createRouter' | 'registerRouteHandlerContext'> {
  auth: HttpServerSetup['auth'];
  server: HttpServerSetup['server'];
  externalUrl: ExternalUrlConfig;
  createRouter: <Context extends RequestHandlerContextBase = RequestHandlerContextBase>(
    path: string,
    plugin?: PluginOpaqueId
  ) => IRouter<Context>;
  registerRouterAfterListening: (router: IRouter) => void;
  registerStaticDir: (path: string, dirPath: string) => void;
  authRequestHeaders: IAuthHeadersStorage;
  registerRouteHandlerContext: <
    Context extends RequestHandlerContextBase,
    ContextName extends keyof Omit<Context, 'resolve'>
  >(
    pluginOpaqueId: PluginOpaqueId,
    contextName: ContextName,
    provider: IContextProvider<Context, ContextName>
  ) => IContextContainer;

  registerPrebootRoutes(path: string, callback: (router: IRouter) => void): void;
}

/** @internal */
export interface InternalHttpServiceStart extends HttpServiceStart {
  /** Indicates if the http server is listening on the configured port */
  isListening: () => boolean;
}
