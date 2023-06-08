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
  RequestHandlerContextBase,
  KibanaRequest,
  KibanaResponseFactory,
  ApiVersion,
  AddVersionOpts,
  VersionedRoute,
  VersionedRouteConfig,
  IKibanaResponse,
  RouteConfigOptions,
} from '@kbn/core-http-server';
import type { Mutable } from 'utility-types';
import type { Method } from './types';
import type { CoreVersionedRouter } from './core_versioned_router';

import { validate } from './validate';
import { isValidRouteVersion } from './is_valid_route_version';
import { injectResponseHeaders } from './inject_response_headers';

import { resolvers } from './handler_resolvers';

type Options = AddVersionOpts<unknown, unknown, unknown>;

// This validation is a pass-through so that we can apply our version-specific validation later
export const passThroughValidation = {
  body: schema.nullable(schema.any()),
  params: schema.nullable(schema.any()),
  query: schema.nullable(schema.any()),
};

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
    router: CoreVersionedRouter;
    method: Method;
    path: string;
    options: VersionedRouteConfig<Method>;
  }) {
    return new CoreVersionedRoute(router, method, path, options);
  }

  private isPublic: boolean;
  private constructor(
    private readonly router: CoreVersionedRouter,
    public readonly method: Method,
    public readonly path: string,
    public readonly options: VersionedRouteConfig<Method>
  ) {
    this.isPublic = this.options.access === 'public';
    this.router.router[this.method](
      {
        path: this.path,
        validate: passThroughValidation,
        options: this.getRouteConfigOptions(),
      },
      this.requestHandler
    );
  }

  private getRouteConfigOptions(): RouteConfigOptions<Method> {
    return {
      access: this.options.access,
      ...this.options.options,
    };
  }

  /** This method assumes that one or more versions handlers are registered  */
  private getDefaultVersion(): ApiVersion {
    return resolvers[this.router.defaultHandlerResolutionStrategy]([...this.handlers.keys()]);
  }

  private getAvailableVersionsMessage(): string {
    const versions = [...this.handlers.keys()];
    return `Available versions are: ${
      versions.length ? '[' + [...versions].join(', ') + ']' : '<none>'
    }`;
  }

  private requestHandler = async (
    ctx: RequestHandlerContextBase,
    req: KibanaRequest,
    res: KibanaResponseFactory
  ): Promise<IKibanaResponse> => {
    if (this.handlers.size <= 0) {
      return res.custom({
        statusCode: 500,
        body: `No handlers registered for [${this.method}] [${this.path}].`,
      });
    }
    const version = this.getVersion(req);

    const invalidVersionMessage = isValidRouteVersion(this.isPublic, version);
    if (invalidVersionMessage) {
      return res.badRequest({ body: invalidVersionMessage });
    }

    const handler = this.handlers.get(version);
    if (!handler) {
      return res.badRequest({
        body: `No version "${version}" available for [${this.method}] [${
          this.path
        }]. ${this.getAvailableVersionsMessage()}`,
      });
    }

    const validation = handler.options.validate || undefined;

    const mutableCoreKibanaRequest = req as Mutable<KibanaRequest>;
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
        return res.badRequest({
          body: e.message,
        });
      }
    } else {
      // Preserve behavior of not passing through unvalidated data
      mutableCoreKibanaRequest.body = {};
      mutableCoreKibanaRequest.params = {};
      mutableCoreKibanaRequest.query = {};
    }

    const response = await handler.fn(ctx, mutableCoreKibanaRequest, res);

    if (this.router.isDev && validation?.response?.[response.status]) {
      const responseValidation = validation.response[response.status];
      try {
        validate(
          { body: response.payload },
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

    return injectResponseHeaders(
      {
        [ELASTIC_HTTP_VERSION_HEADER]: version,
      },
      response
    );
  };

  private getVersion(request: KibanaRequest): ApiVersion {
    const versions = request.headers?.[ELASTIC_HTTP_VERSION_HEADER];
    return Array.isArray(versions) ? versions[0] : versions ?? this.getDefaultVersion();
  }

  private validateVersion(version: string) {
    const message = isValidRouteVersion(this.isPublic, version);
    if (message) {
      throw new Error(message);
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
