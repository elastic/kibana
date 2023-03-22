/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type {
  RequestHandler,
  IRouter,
  RequestHandlerContextBase,
  KibanaRequest,
  KibanaResponseFactory,
} from '@kbn/core-http-server';
import type {
  Version,
  AddVersionOpts,
  VersionedRoute,
  VersionedRouteConfig,
} from '@kbn/core-versioned-http-server';
import type { Method } from './types';

type Options = AddVersionOpts<unknown, unknown, unknown, unknown>;

export class InternalVersionedRoute implements VersionedRoute {
  private readonly handlers = new Map<
    Version,
    {
      handler: RequestHandler;
      options: Options;
    }
  >();

  constructor(
    private readonly router: IRouter,
    public readonly method: Method,
    public readonly path: string,
    public readonly options: VersionedRouteConfig<Method>
  ) {}

  /** This is where we must implement the versioned spec once it is available */
  private requestHandler = async (
    ctx: RequestHandlerContextBase,
    req: KibanaRequest,
    res: KibanaResponseFactory
  ) => {
    return res.ok();
  };

  public addVersion(options: Options, handler: RequestHandler<any, any, any, any>): VersionedRoute {
    if (!this.handlers.has(options.version)) {
      throw new Error(
        `Version ${
          options.version
        } handler has already been registered for the route "${this.method.toLowerCase()} ${
          this.path
        }"`
      );
    }

    this.handlers.set(options.version, { handler, options });
    if (this.handlers.size === 1) {
      this.router[this.method](
        { path: this.path, validate: false, options: this.options },
        this.requestHandler
      );
    }
    return this;
  }

  public getHandlers(): Array<{ handler: RequestHandler; options: Options }> {
    return [...this.handlers.values()];
  }
}
