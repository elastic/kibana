/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  RequestHandler,
  VersionedRoute,
  VersionedRouteConfig,
  RouteSecurityGetter,
  RouteMethod,
} from '@kbn/core-http-server';
import type { Logger } from '@kbn/logging';
import type { Env } from '@kbn/config';
import type { HandlerResolutionStrategy, Method, Options } from './types';
import type { RequestHandlerEnhanced, Router } from '../router';
interface InternalVersionedRouteConfig<M extends RouteMethod> extends VersionedRouteConfig<M> {
  env: Env;
  useVersionResolutionStrategyForInternalPaths: Map<string, boolean>;
  defaultHandlerResolutionStrategy: HandlerResolutionStrategy;
}
export declare class CoreVersionedRoute implements VersionedRoute {
  private readonly router;
  private readonly log;
  readonly method: Method;
  readonly path: string;
  readonly handlers: Map<
    string,
    {
      fn: RequestHandlerEnhanced<unknown, unknown, unknown, RouteMethod>;
      options: Options;
    }
  >;
  static from({
    router,
    log,
    method,
    path,
    options,
  }: {
    router: Router;
    log: Logger;
    method: Method;
    path: string;
    options: InternalVersionedRouteConfig<Method>;
  }): CoreVersionedRoute;
  readonly options: VersionedRouteConfig<Method>;
  private useDefaultStrategyForPath;
  private isPublic;
  private env;
  private enableQueryVersion;
  private defaultSecurityConfig;
  private defaultHandlerResolutionStrategy;
  private constructor();
  private getRouteConfigOptions;
  /** This method assumes that one or more versions handlers are registered  */
  private getDefaultVersion;
  private versionsToString;
  private getVersion;
  private handle;
  private validateVersion;
  addVersion(options: Options, handler: RequestHandler<any, any, any, any>): VersionedRoute;
  getHandlers(): Array<{
    fn: RequestHandlerEnhanced<unknown, unknown, unknown, RouteMethod>;
    options: Options;
  }>;
  getSecurity: RouteSecurityGetter;
}
export {};
