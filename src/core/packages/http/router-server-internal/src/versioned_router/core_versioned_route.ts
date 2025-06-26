/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  ELASTIC_HTTP_VERSION_HEADER,
  ELASTIC_HTTP_VERSION_QUERY_PARAM,
} from '@kbn/core-http-common';
import type {
  RequestHandler,
  ApiVersion,
  VersionedRoute,
  VersionedRouteConfig,
  IKibanaResponse,
  RouteConfigOptions,
  RouteSecurityGetter,
  RouteSecurity,
  RouteMethod,
  VersionedRouterRoute,
} from '@kbn/core-http-server';
import { Request } from '@hapi/hapi';
import { Logger } from '@kbn/logging';
import { Env } from '@kbn/config';
import type { HandlerResolutionStrategy, Method, Options } from './types';

import {
  isAllowedPublicVersion,
  isValidRouteVersion,
  hasQueryVersion,
  readVersion,
  removeQueryVersion,
} from './route_version_utils';
import { injectResponseHeaders, injectVersionHeader } from '../util';
import { validRouteSecurity } from '../security_route_config_validator';

import { resolvers } from './handler_resolvers';
import { prepareVersionedRouteValidation, unwrapVersionedResponseBodyValidation } from './util';
import type { RequestLike } from './route_version_utils';
import { RequestHandlerEnhanced, Router } from '../router';
import { kibanaResponseFactory as responseFactory } from '../response';
import { validateHapiRequest } from '../route';
import { RouteValidator } from '../validator';
import { getWarningHeaderMessageFromRouteDeprecation } from '../get_warning_header_message';

interface InternalVersionedRouteConfig<M extends RouteMethod> extends VersionedRouteConfig<M> {
  env: Env;
  useVersionResolutionStrategyForInternalPaths: Map<string, boolean>;
  defaultHandlerResolutionStrategy: HandlerResolutionStrategy;
}

function extractValidationSchemaFromHandler(handler: VersionedRouterRoute['handlers'][0]) {
  if (handler.options.validate === false) return undefined;
  if (typeof handler.options.validate === 'function') return handler.options.validate();
  return handler.options.validate;
}

export class CoreVersionedRoute implements VersionedRoute {
  public readonly handlers = new Map<
    ApiVersion,
    {
      fn: RequestHandlerEnhanced<unknown, unknown, unknown, RouteMethod>;
      options: Options;
    }
  >();

  public static from({
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
  }) {
    return new CoreVersionedRoute(router, log, method, path, options);
  }

  public readonly options: VersionedRouteConfig<Method>;

  private useDefaultStrategyForPath: boolean;
  private isPublic: boolean;
  private env: Env;
  private enableQueryVersion: boolean;
  private defaultSecurityConfig: RouteSecurity | undefined;
  private defaultHandlerResolutionStrategy: HandlerResolutionStrategy;
  private constructor(
    private readonly router: Router,
    private readonly log: Logger,
    public readonly method: Method,
    public readonly path: string,
    internalOptions: InternalVersionedRouteConfig<Method>
  ) {
    const {
      env,
      useVersionResolutionStrategyForInternalPaths,
      defaultHandlerResolutionStrategy,
      ...options
    } = internalOptions;
    this.isPublic = options.access === 'public';
    this.env = env;
    this.defaultHandlerResolutionStrategy = defaultHandlerResolutionStrategy;
    this.useDefaultStrategyForPath =
      this.isPublic || useVersionResolutionStrategyForInternalPaths.has(path);
    this.enableQueryVersion = options.enableQueryVersion === true;
    this.defaultSecurityConfig = validRouteSecurity(options.security, options.options);
    this.options = options;
    this.router.registerRoute({
      path: this.path,
      options: this.getRouteConfigOptions(),
      security: this.getSecurity,
      handler: (request) => this.handle(request),
      isVersioned: true,
      method: this.method,
    });
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
      } else if (!this.env.mode.dev && !this.isPublic) {
        // When in production, we default internal routes to v1 to allow
        // gracefully onboarding of un-versioned to versioned routes
        version = '1';
      }
    } else {
      version = maybeVersion;
    }

    return version;
  }

  private handle = async (hapiRequest: Request): Promise<IKibanaResponse> => {
    if (this.handlers.size <= 0) {
      return responseFactory.custom({
        statusCode: 500,
        body: `No handlers registered for [${this.method}] [${this.path}].`,
      });
    }
    const version = this.getVersion(hapiRequest);

    if (!version) {
      return responseFactory.badRequest({
        body: `Please specify a version via ${ELASTIC_HTTP_VERSION_HEADER} header. Available versions: ${this.versionsToString()}`,
      });
    }
    if (hasQueryVersion(hapiRequest)) {
      if (!this.enableQueryVersion) {
        return responseFactory.badRequest({
          body: `Use of query parameter "${ELASTIC_HTTP_VERSION_QUERY_PARAM}" is not allowed. Please specify the API version using the "${ELASTIC_HTTP_VERSION_HEADER}" header.`,
        });
      }
      removeQueryVersion(hapiRequest);
    }

    const invalidVersionMessage = isValidRouteVersion(this.isPublic, version);
    if (invalidVersionMessage) {
      return responseFactory.badRequest({ body: invalidVersionMessage });
    }

    const handler = this.handlers.get(version);
    if (!handler) {
      return responseFactory.badRequest({
        body: `No version "${version}" available for [${this.method}] [${
          this.path
        }]. Available versions are: ${this.versionsToString()}`,
      });
    }
    const validation = extractValidationSchemaFromHandler(handler);

    const { error, ok: kibanaRequest } = validateHapiRequest(hapiRequest, {
      routeInfo: {
        access: this.options.access,
        httpResource: this.options.options?.httpResource,
        deprecated: handler.options?.options?.deprecated,
      },
      router: this.router,
      log: this.log,
      routeSchemas: validation?.request ? RouteValidator.from(validation.request) : undefined,
      version,
    });
    if (error) {
      return injectVersionHeader(version, error);
    }

    let response = await handler.fn(kibanaRequest, responseFactory);

    // we don't want to overwrite the header value
    if (handler.options.options?.deprecated && !response.options.headers?.warning) {
      response = injectResponseHeaders(
        {
          warning: getWarningHeaderMessageFromRouteDeprecation(
            handler.options.options.deprecated,
            this.env.packageInfo.version
          ),
        },
        response
      );
    }

    if (this.env.mode.dev && validation?.response?.[response.status]?.body) {
      const { [response.status]: responseValidation, unsafe } = validation.response;
      try {
        const validator = RouteValidator.from({
          body: unwrapVersionedResponseBodyValidation(responseValidation.body!),
          unsafe: { body: unsafe?.body },
        });
        validator.getBody(response.payload, 'response body');
      } catch (e) {
        return responseFactory.custom({
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
    if (this.env.mode.dev && this.isPublic) {
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
      fn: this.router.enhanceWithContext(handler),
      options,
    });
    return this;
  }

  public getHandlers(): Array<{
    fn: RequestHandlerEnhanced<unknown, unknown, unknown, RouteMethod>;
    options: Options;
  }> {
    return [...this.handlers.values()];
  }

  public getSecurity: RouteSecurityGetter = (req?: RequestLike) => {
    if (!req) {
      return this.defaultSecurityConfig;
    }

    const version = this.getVersion(req)!;
    const security = this.handlers.get(version)?.options.security ?? this.defaultSecurityConfig;

    // authc can be defined only on the top route level,
    // so we need to merge it with the versioned one which can have different authz per version
    return security
      ? { authz: security.authz, authc: this.defaultSecurityConfig?.authc }
      : undefined;
  };
}
