/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';
import type {
  RequestHandler,
  IRouter,
  RequestHandlerContextBase,
  KibanaRequest,
  KibanaResponseFactory,
} from '@kbn/core-http-server';
import type {
  ApiVersion,
  AddVersionOpts,
  VersionedRoute,
  VersionedRouteConfig,
} from '@kbn/core-http-server';
import type { CoreKibanaRequest } from '@kbn/core-http-router-server-internal';
import type { Mutable } from 'utility-types';
import type { Method } from './types';

import { validate } from './validate';

type Options = AddVersionOpts<unknown, unknown, unknown, unknown>;

// This validation is a pass-through so that we can apply our version-specific validation later
const passThroughValidation = { body: schema.any(), params: schema.any(), query: schema.any() };

export class CoreVersionedRoute implements VersionedRoute {
  private readonly handlers = new Map<
    ApiVersion,
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

  private getAvailableVersionsMessage(): string {
    return `Available versions are: "${[...this.handlers.keys()].join(',') || 'none'}"`;
  }

  /** This is where we must implement the versioned spec once it is available */
  private requestHandler = async (
    ctx: RequestHandlerContextBase,
    req: KibanaRequest,
    res: KibanaResponseFactory
  ) => {
    const version = req.headers?.[ELASTIC_HTTP_VERSION_HEADER] as undefined | ApiVersion;
    if (!version) {
      return res.custom({
        statusCode: 406,
        body: `Version expected at [${this.method}] [${
          this.path
        }]. Please specify a version using the "${ELASTIC_HTTP_VERSION_HEADER}" header. ${this.getAvailableVersionsMessage()}`,
      });
    }

    const handler = this.handlers.get(version);
    if (!handler) {
      return res.custom({
        statusCode: 406,
        body: `No version "${version}" available for [${this.method}] [${
          this.path
        }]. ${this.getAvailableVersionsMessage()}`,
      });
    }

    const validation = handler.options.validate || undefined;

    const mutableCoreKibanaRequest = req as Mutable<CoreKibanaRequest>;
    if (
      validation?.request &&
      Boolean(validation.request.body || validation.request.params || validation.request.query)
    ) {
      try {
        const { body, params, query } = validate(
          mutableCoreKibanaRequest,
          validation.request,
          handler.options.version
        );
        mutableCoreKibanaRequest.body = body;
        mutableCoreKibanaRequest.params = params;
        mutableCoreKibanaRequest.query = query;
      } catch (e) {
        return res.custom({
          statusCode: 400,
          body: e.message,
        });
      }
    } else {
      // Preserve behavior of not passing through unvalidated data
      mutableCoreKibanaRequest.body = {};
      mutableCoreKibanaRequest.params = {};
      mutableCoreKibanaRequest.query = {};
    }

    const result = await handler.fn(ctx, mutableCoreKibanaRequest, res);

    if (this.validateResponses && validation?.response?.[result.status]) {
      const responseValidation = validation.response[result.status];
      try {
        validate(
          req,
          { body: responseValidation.body, unsafe: { body: validation.response.unsafe?.body } },
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

  private validateVersion(version: string) {
    const float = parseFloat(version);
    if (!isFinite(float) || isNaN(float) || float <= 0 || Math.round(float) !== float) {
      throw new Error(
        `Invalid version number. Received "${version}", expected any finite, whole number greater than 0.`
      );
    }

    if (this.handlers.has(version as ApiVersion)) {
      throw new Error(
        `Version "${version}" handler has already been registered for the route [${this.method.toLowerCase()}] [${
          this.path
        }]"`
      );
    }
  }

  public addVersion(options: Options, handler: RequestHandler<any, any, any, any>): VersionedRoute {
    this.validateVersion(options.version);
    this.handlers.set(options.version, { fn: handler, options });
    return this;
  }

  public getHandlers(): Array<{ fn: RequestHandler; options: Options }> {
    return [...this.handlers.values()];
  }
}
