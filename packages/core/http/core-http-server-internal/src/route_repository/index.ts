/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ObjectType, TypeOf } from '@kbn/config-schema';
import { HttpFetchOptions } from '@kbn/core-http-browser';
import type {
  CustomRequestHandlerContext,
  RequestHandlerContext,
} from '@kbn/core-http-request-handler-context-server';
import {
  IKibanaResponse,
  KibanaRequest,
  KibanaResponseFactory,
  RouteConfigOptions,
} from '@kbn/core-http-server';
import type {
  CoreSetup as PublicCoreSetup,
  CoreStart as PublicCoreStart,
} from '@kbn/core-lifecycle-browser';
import type { CoreSetup } from '@kbn/core-lifecycle-server';
import { RequiredKeys } from 'utility-types';

type HttpVerb = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
type DateString = `${string}-${string}-${string}`;

type ValidateEndpoint<TEndpoint extends string> =
  TEndpoint extends `${HttpVerb} /api/${string} ${DateString}`
    ? true
    : TEndpoint extends `${HttpVerb} /internal/${infer Route}`
    ? Route extends `${string}${' '}${string}`
      ? false
      : true
    : false;

type ExtractHttpMethod<TEndpoint extends string> = TEndpoint extends `${infer Verb} ${string}`
  ? Verb extends HttpVerb
    ? Lowercase<Verb>
    : never
  : never;

// https://dev.to/bytimo/useful-types-extract-route-params-with-typescript-5fhn
type ExtractPathParams<TEndpoint extends string> =
  TEndpoint extends `${HttpVerb} /api/${infer PublicPath} ${DateString}`
    ? ExtractParams<PublicPath>
    : TEndpoint extends `${HttpVerb} /internal/${infer InternalPath}`
    ? ExtractParams<InternalPath>
    : never;

type ExtractParams<Path> = Path extends `${infer Segment}/${infer Rest}`
  ? ExtractParam<Segment, ExtractParams<Rest>>
  : ExtractParam<Path, {}>;

type ExtractParam<Path, NextPart> = Path extends `{${infer Param}}`
  ? Record<Param, any> & NextPart
  : NextPart;

type ServerRoute<
  TEndpoint extends string,
  TContext extends RequestHandlerContext,
  TParams extends ObjectType<{
    [K in keyof ExtractPathParams<TEndpoint>]: any;
  }>,
  TQuery,
  TBody,
  TResponse extends IKibanaResponse<any> | Promise<IKibanaResponse<any>>,
  TDependencies,
  TValidatedEndpoint extends string = ValidateEndpoint<TEndpoint> extends true ? TEndpoint : never
> = {
  endpoint: TValidatedEndpoint;
  handler: (
    context: TContext,
    request: KibanaRequest<
      keyof ExtractPathParams<TEndpoint> extends never ? never : TypeOf<TParams>,
      TQuery extends ObjectType<any> ? TypeOf<TQuery> : never,
      TBody extends ObjectType<any> ? TypeOf<TBody> : never,
      ExtractHttpMethod<TValidatedEndpoint>
    >,
    response: KibanaResponseFactory,
    dependencies: TDependencies
  ) => TResponse;
  options?: RouteConfigOptions<ExtractHttpMethod<TValidatedEndpoint>>;
} & (keyof ExtractPathParams<TEndpoint> extends never
  ? {
      validate?:
        | {
            query: TQuery extends ObjectType<any> ? TQuery : never;
          }
        | {
            body: TBody extends ObjectType<any> ? TBody : never;
          };
    }
  : {
      validate: {
        params: TParams;
        query?: TQuery extends ObjectType<any> ? TQuery : never;
        body?: TBody extends ObjectType<any> ? TBody : never;
      };
    });

function createRepository<TRequestHandlerContext, TDependencies = never>(
  core: CoreSetup,
  dependencies: TDependencies
) {
  return {
    createRoute: createRouteFactory<
      CustomRequestHandlerContext<TRequestHandlerContext>,
      TDependencies
    >(),
    registerRoutes: registerRoutesFactory<TDependencies>(core, dependencies),
  };
}

function createRouteFactory<
  TRequestHandlerContext extends RequestHandlerContext = RequestHandlerContext,
  TDependencies = never
>(): <
  TEndpoint extends string,
  TParams extends ObjectType<{
    [K in keyof ExtractPathParams<TEndpoint>]: any;
  }>,
  TQuery,
  TBody,
  TResponse extends IKibanaResponse<any> | Promise<IKibanaResponse<any>>
>(
  route: ServerRoute<
    TEndpoint,
    TRequestHandlerContext,
    TParams,
    TQuery,
    TBody,
    TResponse,
    TDependencies
  >
) => Record<
  TEndpoint,
  ServerRoute<TEndpoint, TRequestHandlerContext, TParams, TQuery, TBody, TResponse, TDependencies>
> {
  // Cast to any because the generics are part of the returned function only
  return (route) => ({ [route.endpoint]: route } as any);
}

type RouteShape = any; // Would like to fix this to be stricter
function registerRoutesFactory<TDependencies = never>(
  core: CoreSetup,
  dependencies: TDependencies
): <TRepository extends Record<string, RouteShape>>(repository: TRepository) => void {
  return (repository) => {
    const router = core.http.createRouter();

    const routes = Object.values(repository);
    routes.forEach((route) => {
      const { endpoint, handler, validate, options } = route;

      const { method, path, version } = parseEndpoint(endpoint);

      const handlerWithDependencies = (context: any, request: any, response: any) => {
        return handler(context, request, response, dependencies);
      };

      if (!version) {
        router[method](
          {
            path,
            options,
            validate,
          },
          handlerWithDependencies
        );
      } else {
        router.versioned[method]({
          path,
          access: path.startsWith('/internal/') ? 'internal' : 'public',
          options,
        }).addVersion(
          {
            version,
            validate: {
              request: validate,
            },
          },
          handlerWithDependencies
        );
      }
    });
  };
}

function parseEndpoint(endpoint: string) {
  const parts = endpoint.split(' ');

  const method = parts[0].trim().toLowerCase() as Lowercase<HttpVerb>;
  const path = parts[1].trim();
  const version = parts[2]?.trim();

  return { method, path, version };
}

type Maybe<T, Field extends string> = [T] extends [never]
  ? {}
  : [RequiredKeys<T>] extends [never]
  ? {
      [K in Field]?: T;
    }
  : {
      [K in Field]: T;
    };

type ExtractValidation<T> = T extends KibanaRequest<infer P, infer Q, infer B>
  ? Maybe<P, 'params'> & Maybe<Q, 'query'> & Maybe<B, 'body'>
  : never;

// asResponse
// rawResponse
type Options<Validate> = Omit<
  HttpFetchOptions,
  'version' | 'method' | 'query' | 'params' | 'body'
> &
  Validate;
type Client<T extends Record<string, any>, Endpoint extends string = Extract<keyof T, string>> = (
  endpoint: Endpoint,
  options: Options<ExtractValidation<Parameters<T[keyof T]['handler']>[1]>>
) => Promise<ReturnType<T[keyof T]['handler']>>;

function createClient<T extends Record<string, any>>(core: PublicCoreStart | PublicCoreSetup) {
  return ((endpoint, options) => {
    const { params, query, body, ...otherOptions } = options;

    const { method, path, version } = formatRequest(endpoint, params as Record<string, any>);

    return core.http[method](path, {
      ...otherOptions,
      version,
      query: query as any,
      body: body ? JSON.stringify(body) : undefined,
    });
  }) as Client<T>;
}

// Should the second generic arg on Record be string?
function formatRequest(endpoint: string, pathParams: Record<string, any> = {}) {
  const { method, path: rawPath, version } = parseEndpoint(endpoint);

  const path = Object.keys(pathParams).reduce((acc, paramName) => {
    return acc.replace(`{${paramName}}`, pathParams[paramName]);
  }, rawPath);

  return { method, path, version };
}

export { createRepository, createClient };
