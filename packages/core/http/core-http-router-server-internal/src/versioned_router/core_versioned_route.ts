/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
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
  VersionedRoute,
  VersionedRouteConfig,
  IKibanaResponse,
  RouteConfigOptions,
  RouteSecurityGetter,
  RouteSecurity,
  RouteMethod,
  VersionedRouterRoute,
  PostValidationMetadata,
} from '@kbn/core-http-server';
import type { Mutable } from 'utility-types';
import type { HandlerResolutionStrategy, Method, Options } from './types';

import { validate } from './validate';
import {
  isAllowedPublicVersion,
  isValidRouteVersion,
  hasQueryVersion,
  readVersion,
  removeQueryVersion,
} from './route_version_utils';
import { getVersionHeader, injectVersionHeader } from '../util';
import { validRouteSecurity } from '../security_route_config_validator';

import { resolvers } from './handler_resolvers';
import { prepareVersionedRouteValidation, unwrapVersionedResponseBodyValidation } from './util';
import type { RequestLike } from './route_version_utils';
import { Router } from '../router';

interface InternalVersionedRouteConfig<M extends RouteMethod> extends VersionedRouteConfig<M> {
  isDev: boolean;
  useVersionResolutionStrategyForInternalPaths: Map<string, boolean>;
  defaultHandlerResolutionStrategy: HandlerResolutionStrategy;
}

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
  public readonly handlers = new Map<
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
    router: Router;
    method: Method;
    path: string;
    options: InternalVersionedRouteConfig<Method>;
  }) {
    return new CoreVersionedRoute(router, method, path, options);
  }

  public readonly options: VersionedRouteConfig<Method>;

  private useDefaultStrategyForPath: boolean;
  private isPublic: boolean;
  private isDev: boolean;
  private enableQueryVersion: boolean;
  private defaultSecurityConfig: RouteSecurity | undefined;
  private defaultHandlerResolutionStrategy: HandlerResolutionStrategy;
  private constructor(
    private readonly router: Router,
    public readonly method: Method,
    public readonly path: string,
    internalOptions: InternalVersionedRouteConfig<Method>
  ) {
    const {
      isDev,
      useVersionResolutionStrategyForInternalPaths,
      defaultHandlerResolutionStrategy,
      ...options
    } = internalOptions;
    this.isPublic = options.access === 'public';
    this.isDev = isDev;
    this.defaultHandlerResolutionStrategy = defaultHandlerResolutionStrategy;
    this.useDefaultStrategyForPath =
      this.isPublic || useVersionResolutionStrategyForInternalPaths.has(path);
    this.enableQueryVersion = options.enableQueryVersion === true;
    this.defaultSecurityConfig = validRouteSecurity(options.security, options.options);
    this.options = options;
    this.router[this.method](
      {
        path: this.path,
        validate: passThroughValidation,
        // @ts-expect-error upgrade typescript v5.1.6
        options: this.getRouteConfigOptions(),
        security: this.getSecurity,
      },
      this.requestHandler,
      { isVersioned: true, events: false }
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
    return resolvers[this.defaultHandlerResolutionStrategy](
      [...this.handlers.keys()],
      this.options.access
    );
  }

  private versionsToString(): string {
    return this.handlers.size ? '[' + [...this.handlers.keys()].join(', ') + ']' : '<none>';
  }

  private getVersion(req: RequestLike): ApiVersion | undefined {
    let version;
    const maybeVersion = readVersion(req, this.enableQueryVersion);
    if (!maybeVersion) {
      if (this.useDefaultStrategyForPath) {
        version = this.getDefaultVersion();
      } else if (!this.isDev && !this.isPublic) {
        // When in production, we default internal routes to v1 to allow
        // gracefully onboarding of un-versioned to versioned routes
        version = '1';
      }
    } else {
      version = maybeVersion;
    }

    return version;
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
    const version = this.getVersion(req);
    req.apiVersion = version;

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
    const postValidateMetadata: PostValidationMetadata = {
      deprecated: handler.options.options?.deprecated,
      isInternalApiRequest: req.isInternalApiRequest,
      isPublicAccess: this.isPublic,
    };

    if (
      validation?.request &&
      Boolean(validation.request.body || validation.request.params || validation.request.query)
    ) {
      try {
        const { body, params, query } = validate(req, validation.request);
        req.body = body;
        req.params = params;
        req.query = query;
      } catch (e) {
        // Emit onPostValidation even if validation fails.

        this.router.emitPostValidate(req, postValidateMetadata);
        return res.badRequest({ body: e.message, headers: getVersionHeader(version) });
      }
    } else {
      // Preserve behavior of not passing through unvalidated data
      req.body = {};
      req.params = {};
      req.query = {};
    }

    this.router.emitPostValidate(req, postValidateMetadata);

    const response = await handler.fn(ctx, req, res);

    if (this.isDev && validation?.response?.[response.status]?.body) {
      const { [response.status]: responseValidation, unsafe } = validation.response;
      try {
        validate(
          { body: response.payload },
          {
            body: unwrapVersionedResponseBodyValidation(responseValidation.body!),
            unsafe: { body: unsafe?.body },
          }
        );
      } catch (e) {
        return res.custom({
          statusCode: 500,
          body: `Failed output validation: ${e.message}`,
        });
      }
    }

    return injectVersionHeader(version, response);
  };

  private validateVersion(version: string) {
    // We do an additional check here while we only have a single allowed public version
    // for all public Kibana HTTP APIs
    if (this.isDev && this.isPublic) {
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
    options = prepareVersionedRouteValidation(options);
    this.handlers.set(options.version, {
      fn: handler,
      options,
    });
    return this;
  }

  public getHandlers(): Array<{ fn: RequestHandler; options: Options }> {
    return [...this.handlers.values()];
  }

  public getSecurity: RouteSecurityGetter = (req: RequestLike) => {
    const version = this.getVersion(req)!;

    return this.handlers.get(version)?.options.security ?? this.defaultSecurityConfig;
  };
}
