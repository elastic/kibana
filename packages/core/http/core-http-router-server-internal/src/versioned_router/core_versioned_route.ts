/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { schema } from '@kbn/config-schema';
import {
  ELASTIC_HTTP_VERSION_HEADER,
  ELASTIC_HTTP_VERSION_QUERY_PARAM,
} from '@kbn/core-http-common';
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
import type { Method, VersionedRouterRoute } from './types';
import type { CoreVersionedRouter } from './core_versioned_router';

import { validate } from './validate';
import {
  isAllowedPublicVersion,
  isValidRouteVersion,
  hasQueryVersion,
  readVersion,
  removeQueryVersion,
} from './route_version_utils';
import { injectResponseHeaders } from './inject_response_headers';

import { resolvers } from './handler_resolvers';

type Options = AddVersionOpts<unknown, unknown, unknown>;

// This validation is a pass-through so that we can apply our version-specific validation later
export const passThroughValidation = {
  body: schema.nullable(schema.any()),
  params: schema.nullable(schema.any()),
  query: schema.nullable(schema.any()),
};

function extractValidationSchemaFromHandler(handler: VersionedRouterRoute['handlers'][0]) {
  if (handler.options.validate === false) return undefined;
  if (typeof handler.options.validate === 'function') return handler.options.validate();
  return handler.options.validate;
}

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

  private useDefaultStrategyForPath: boolean;
  private isPublic: boolean;
  private enableQueryVersion: boolean;
  private constructor(
    private readonly router: CoreVersionedRouter,
    public readonly method: Method,
    public readonly path: string,
    public readonly options: VersionedRouteConfig<Method>
  ) {
    this.useDefaultStrategyForPath = router.useVersionResolutionStrategyForInternalPaths.has(path);
    this.isPublic = this.options.access === 'public';
    this.enableQueryVersion = this.options.enableQueryVersion === true;
    this.router.router[this.method](
      {
        path: this.path,
        validate: passThroughValidation,
        options: this.getRouteConfigOptions(),
      },
      this.requestHandler,
      { isVersioned: true }
    );
  }

  private getRouteConfigOptions(): RouteConfigOptions<Method> {
    return {
      access: this.options.access,
      ...this.options.options,
    };
  }

  /** This method assumes that one or more versions handlers are registered  */
  private getDefaultVersion(): undefined | ApiVersion {
    return resolvers[this.router.defaultHandlerResolutionStrategy]([...this.handlers.keys()]);
  }

  private versionsToString(): string {
    return this.handlers.size ? '[' + [...this.handlers.keys()].join(', ') + ']' : '<none>';
  }

  private requestHandler = async (
    ctx: RequestHandlerContextBase,
    originalReq: KibanaRequest,
    res: KibanaResponseFactory
  ): Promise<IKibanaResponse> => {
    if (this.handlers.size <= 0) {
      return res.custom({
        statusCode: 500,
        body: `No handlers registered for [${this.method}] [${this.path}].`,
      });
    }
    const req = originalReq as Mutable<KibanaRequest>;
    let version: undefined | ApiVersion;

    const maybeVersion = readVersion(req, this.enableQueryVersion);
    if (!maybeVersion && (this.isPublic || this.useDefaultStrategyForPath)) {
      version = this.getDefaultVersion();
    } else {
      version = maybeVersion;
    }
    if (!version) {
      return res.badRequest({
        body: `Please specify a version via ${ELASTIC_HTTP_VERSION_HEADER} header. Available versions: ${this.versionsToString()}`,
      });
    }
    if (hasQueryVersion(req)) {
      if (this.enableQueryVersion) {
        // This endpoint has opted-in to query versioning, so we remove the query parameter as it is reserved
        removeQueryVersion(req);
      } else
        return res.badRequest({
          body: `Use of query parameter "${ELASTIC_HTTP_VERSION_QUERY_PARAM}" is not allowed. Please specify the API version using the "${ELASTIC_HTTP_VERSION_HEADER}" header.`,
        });
    }

    const invalidVersionMessage = isValidRouteVersion(this.isPublic, version);
    if (invalidVersionMessage) {
      return res.badRequest({ body: invalidVersionMessage });
    }

    const handler = this.handlers.get(version);
    if (!handler) {
      return res.badRequest({
        body: `No version "${version}" available for [${this.method}] [${
          this.path
        }]. Available versions are: ${this.versionsToString()}`,
      });
    }
    const validation = extractValidationSchemaFromHandler(handler);
    if (
      validation?.request &&
      Boolean(validation.request.body || validation.request.params || validation.request.query)
    ) {
      try {
        const { body, params, query } = validate(req, validation.request, handler.options.version);
        req.body = body;
        req.params = params;
        req.query = query;
      } catch (e) {
        return res.badRequest({
          body: e.message,
        });
      }
    } else {
      // Preserve behavior of not passing through unvalidated data
      req.body = {};
      req.params = {};
      req.query = {};
    }

    const response = await handler.fn(ctx, req, res);

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

  private validateVersion(version: string) {
    // We do an additional check here while we only have a single allowed public version
    // for all public Kibana HTTP APIs
    if (this.router.isDev && this.isPublic) {
      const message = isAllowedPublicVersion(version);
      if (message) {
        throw new Error(message);
      }
    }

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
