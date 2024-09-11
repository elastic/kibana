/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HttpFetchOptions } from '@kbn/core-http-browser';
import type { IKibanaResponse } from '@kbn/core-http-server';
import type {
  KibanaRequest,
  KibanaResponseFactory,
  Logger,
  RequestHandlerContext,
  RouteConfigOptions,
  RouteMethod,
} from '@kbn/core/server';
import { z } from '@kbn/zod';
import * as t from 'io-ts';
import { RequiredKeys } from 'utility-types';

type PathMaybeOptional<T extends { path: Record<string, any> }> = RequiredKeys<
  T['path']
> extends never
  ? { path?: T['path'] }
  : { path: T['path'] };

type QueryMaybeOptional<T extends { query: Record<string, any> }> = RequiredKeys<
  T['query']
> extends never
  ? { query?: T['query'] }
  : { query: T['query'] };

type BodyMaybeOptional<T extends { body: Record<string, any> }> = RequiredKeys<
  T['body']
> extends never
  ? { body?: T['body'] }
  : { body: T['body'] };

type ParamsMaybeOptional<
  TPath extends Record<string, any>,
  TQuery extends Record<string, any>,
  TBody extends Record<string, any>
> = PathMaybeOptional<{ path: TPath }> &
  QueryMaybeOptional<{ query: TQuery }> &
  BodyMaybeOptional<{ body: TBody }>;

type ZodMaybeOptional<T extends { path: any; query: any; body: any }> = ParamsMaybeOptional<
  T['path'],
  T['query'],
  T['body']
>;

type MaybeOptional<T extends { params: Record<string, any> }> = RequiredKeys<
  T['params']
> extends never
  ? { params?: T['params'] }
  : { params: T['params'] };

type WithoutIncompatibleMethods<T extends t.Any> = Omit<T, 'encode' | 'asEncoder'> & {
  encode: t.Encode<any, any>;
  asEncoder: () => t.Encoder<any, any>;
};

export type ZodParamsObject = z.ZodObject<{
  path?: any;
  query?: any;
  body?: any;
}>;

export type IoTsParamsObject = WithoutIncompatibleMethods<
  t.Type<{
    path?: any;
    query?: any;
    body?: any;
  }>
>;

export type RouteParamsRT = IoTsParamsObject | ZodParamsObject;

export interface RouteState {
  [endpoint: string]: ServerRoute<any, any, any, any, any>;
}

export type ServerRouteHandlerResources = Record<string, any>;
export type ServerRouteCreateOptions = Record<string, any>;

type ValidateEndpoint<TEndpoint extends string> = string extends TEndpoint
  ? true
  : TEndpoint extends `${string} ${string} ${string}`
  ? true
  : TEndpoint extends `${string} ${infer TPathname}`
  ? TPathname extends `/internal/${string}`
    ? true
    : false
  : false;

export type ServerRoute<
  TEndpoint extends string,
  TRouteParamsRT extends RouteParamsRT | undefined,
  TRouteHandlerResources extends ServerRouteHandlerResources,
  TReturnType,
  TRouteCreateOptions extends ServerRouteCreateOptions
> = ValidateEndpoint<TEndpoint> extends true
  ? {
      endpoint: TEndpoint;
      params?: TRouteParamsRT;
      handler: ({}: TRouteHandlerResources &
        (TRouteParamsRT extends RouteParamsRT
          ? DecodedRequestParamsOfType<TRouteParamsRT>
          : {})) => Promise<TReturnType>;
    } & TRouteCreateOptions
  : never;

export type ServerRouteRepository = Record<
  string,
  ServerRoute<string, RouteParamsRT | undefined, any, any, Record<string, any>>
>;

type ClientRequestParamsOfType<TRouteParamsRT extends RouteParamsRT> =
  TRouteParamsRT extends t.Mixed
    ? MaybeOptional<{
        params: t.OutputOf<TRouteParamsRT>;
      }>
    : TRouteParamsRT extends z.Schema
    ? MaybeOptional<{
        params: ZodMaybeOptional<z.input<TRouteParamsRT>>;
      }>
    : {};

type DecodedRequestParamsOfType<TRouteParamsRT extends RouteParamsRT> =
  TRouteParamsRT extends t.Mixed
    ? MaybeOptional<{
        params: t.TypeOf<TRouteParamsRT>;
      }>
    : TRouteParamsRT extends z.Schema
    ? MaybeOptional<{
        params: ZodMaybeOptional<z.output<TRouteParamsRT>>;
      }>
    : {};

export type EndpointOf<TServerRouteRepository extends ServerRouteRepository> =
  keyof TServerRouteRepository;

export type ReturnOf<
  TServerRouteRepository extends ServerRouteRepository,
  TEndpoint extends keyof TServerRouteRepository
> = TServerRouteRepository[TEndpoint] extends ServerRoute<
  any,
  any,
  any,
  infer TReturnType,
  ServerRouteCreateOptions
>
  ? TReturnType extends IKibanaResponse<infer TWrappedResponseType>
    ? TWrappedResponseType
    : TReturnType
  : never;

export type DecodedRequestParamsOf<
  TServerRouteRepository extends ServerRouteRepository,
  TEndpoint extends keyof TServerRouteRepository
> = TServerRouteRepository[TEndpoint] extends ServerRoute<
  any,
  infer TRouteParamsRT,
  any,
  any,
  ServerRouteCreateOptions
>
  ? TRouteParamsRT extends RouteParamsRT
    ? DecodedRequestParamsOfType<TRouteParamsRT>
    : {}
  : never;

export type ClientRequestParamsOf<
  TServerRouteRepository extends ServerRouteRepository,
  TEndpoint extends keyof TServerRouteRepository
> = TServerRouteRepository[TEndpoint] extends ServerRoute<
  any,
  infer TRouteParamsRT,
  any,
  any,
  ServerRouteCreateOptions
>
  ? TRouteParamsRT extends RouteParamsRT
    ? ClientRequestParamsOfType<TRouteParamsRT>
    : {}
  : never;

type MaybeOptionalArgs<T extends Record<string, any>> = RequiredKeys<T> extends never
  ? [T] | []
  : [T];

export type RouteRepositoryClient<
  TServerRouteRepository extends ServerRouteRepository,
  TAdditionalClientOptions extends Record<string, any> = DefaultClientOptions
> = <TEndpoint extends Extract<keyof TServerRouteRepository, string>>(
  endpoint: TEndpoint,
  ...args: MaybeOptionalArgs<
    ClientRequestParamsOf<TServerRouteRepository, TEndpoint> & TAdditionalClientOptions
  >
) => Promise<ReturnOf<TServerRouteRepository, TEndpoint>>;

export type DefaultClientOptions = HttpFetchOptions;

interface CoreRouteHandlerResources {
  request: KibanaRequest;
  response: KibanaResponseFactory;
  context: RequestHandlerContext;
}

export interface DefaultRouteHandlerResources extends CoreRouteHandlerResources {
  logger: Logger;
}

export interface DefaultRouteCreateOptions {
  options?: RouteConfigOptions<RouteMethod>;
}
