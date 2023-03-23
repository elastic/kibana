/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
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
} from '@kbn/core-http-server';
import type { CoreKibanaRequest } from '@kbn/core-http-router-server-internal';
import type { Method } from './types';

import { validate } from './validate';

type Options = AddVersionOpts<unknown, unknown, unknown, unknown>;

export const VERSION_HEADER = 'TBD';

// This validation is a pass-through so that we can apply our version-specific validation later
const passThroughValidation = { body: schema.any(), params: schema.any(), query: schema.any() };

export class CoreVersionedRoute implements VersionedRoute {
  private readonly handlers = new Map<
    Version,
    {
      fn: RequestHandler;
      options: Options;
    }
  >();

  public static from({
    router,
    method,
    path,
    options,
  }: {
    router: IRouter;
    method: Method;
    path: string;
    options: VersionedRouteConfig<Method>;
  }) {
    return new CoreVersionedRoute(router, method, path, options);
  }

  private constructor(
    private readonly router: IRouter,
    public readonly method: Method,
    public readonly path: string,
    public readonly options: VersionedRouteConfig<Method>,
    // TODO: Make "true" dev-only
    private readonly validateResponses: boolean = true
  ) {
    this.router[this.method](
      {
        path: this.path,
        validate: passThroughValidation,
        options: this.options,
      },
      this.requestHandler
    );
  }

  /** This is where we must implement the versioned spec once it is available */
  private requestHandler = async (
    ctx: RequestHandlerContextBase,
    req: KibanaRequest,
    res: KibanaResponseFactory
  ) => {
    const version = req.headers[VERSION_HEADER] as undefined | Version;
    if (!version) {
      return res.custom({
        statusCode: 406,
        body: `Version expected at [${this.method}] [${this.path}]. Please specify a version in the ${VERSION_HEADER} header.`,
      });
    }

    const handler = this.handlers.get(version);
    if (!handler) {
      return res.custom({
        statusCode: 406,
        body: `No ${version} available for ${this.method} ${this.path}. Available versions are: ${[
          this.handlers.keys(),
        ].join(',')}`,
      });
    }

    const coreKibanaRequest = req as CoreKibanaRequest;
    if (handler.options.validate && handler.options.validate.request) {
      try {
        const { body, params, query } = validate(
          req,
          handler.options.validate.request,
          handler.options.version
        );
        coreKibanaRequest.body = body;
        coreKibanaRequest.params = params;
        coreKibanaRequest.query = query;
      } catch (e) {
        return res.custom({
          statusCode: 400,
          body: e.message,
        });
      }
    } else {
      // Preserve behavior of not passing through unvalidated data
      coreKibanaRequest.body = {};
      coreKibanaRequest.params = {};
      coreKibanaRequest.query = {};
    }

    const result = await handler.fn(ctx, req, res);

    if (this.validateResponses && handler.options.validate && handler.options.validate.response) {
      const { response } = handler.options.validate;
      try {
        validate(
          req,
          { body: response.body, unsafe: { body: response.unsafe } },
          handler.options.version
        );
      } catch (e) {
        return res.custom({
          statusCode: 500,
          body: `Failed output validation: ${e.message}`,
        });
      }
    }

    return result;
  };

  public addVersion(options: Options, handler: RequestHandler<any, any, any, any>): VersionedRoute {
    if (this.handlers.has(options.version)) {
      throw new Error(
        `Version ${
          options.version
        } handler has already been registered for the route "${this.method.toLowerCase()} ${
          this.path
        }"`
      );
    }

    this.handlers.set(options.version, { fn: handler, options });

    return this;
  }

  public getHandlers(): Array<{ fn: RequestHandler; options: Options }> {
    return [...this.handlers.values()];
  }
}
