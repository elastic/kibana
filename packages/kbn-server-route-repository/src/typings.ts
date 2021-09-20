/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as t from 'io-ts';
import { RequiredKeys } from 'utility-types';

type MaybeOptional<T extends { params: Record<string, any> }> = RequiredKeys<
  T['params']
> extends never
  ? { params?: T['params'] }
  : { params: T['params'] };

type WithoutIncompatibleMethods<T extends t.Any> = Omit<T, 'encode' | 'asEncoder'> & {
  encode: t.Encode<any, any>;
  asEncoder: () => t.Encoder<any, any>;
};

export type RouteParamsRT = WithoutIncompatibleMethods<
  t.Type<{
    path?: any;
    query?: any;
    body?: any;
  }>
>;

export interface RouteState {
  [endpoint: string]: ServerRoute<any, any, any, any, any>;
}

export type ServerRouteHandlerResources = Record<string, any>;
export type ServerRouteCreateOptions = Record<string, any>;

export type ServerRoute<
  TEndpoint extends string,
  TRouteParamsRT extends RouteParamsRT | undefined,
  TRouteHandlerResources extends ServerRouteHandlerResources,
  TReturnType,
  TRouteCreateOptions extends ServerRouteCreateOptions
> = {
  endpoint: TEndpoint;
  params?: TRouteParamsRT;
  handler: ({}: TRouteHandlerResources &
    (TRouteParamsRT extends RouteParamsRT
      ? DecodedRequestParamsOfType<TRouteParamsRT>
      : {})) => Promise<TReturnType>;
} & TRouteCreateOptions;

export interface ServerRouteRepository<
  TRouteHandlerResources extends ServerRouteHandlerResources = ServerRouteHandlerResources,
  TRouteCreateOptions extends ServerRouteCreateOptions = ServerRouteCreateOptions,
  TRouteState extends RouteState = RouteState
> {
  add<
    TEndpoint extends string,
    TReturnType,
    TRouteParamsRT extends RouteParamsRT | undefined = undefined
  >(
    route: ServerRoute<
      TEndpoint,
      TRouteParamsRT,
      TRouteHandlerResources,
      TReturnType,
      TRouteCreateOptions
    >
  ): ServerRouteRepository<
    TRouteHandlerResources,
    TRouteCreateOptions,
    TRouteState & {
      [key in TEndpoint]: ServerRoute<
        TEndpoint,
        TRouteParamsRT,
        TRouteHandlerResources,
        TReturnType,
        TRouteCreateOptions
      >;
    }
  >;
  merge<
    TServerRouteRepository extends ServerRouteRepository<
      TRouteHandlerResources,
      TRouteCreateOptions
    >
  >(
    repository: TServerRouteRepository
  ): TServerRouteRepository extends ServerRouteRepository<
    TRouteHandlerResources,
    TRouteCreateOptions,
    infer TRouteStateToMerge
  >
    ? ServerRouteRepository<
        TRouteHandlerResources,
        TRouteCreateOptions,
        TRouteState & TRouteStateToMerge
      >
    : never;
  getRoutes: () => Array<
    ServerRoute<string, RouteParamsRT, TRouteHandlerResources, unknown, TRouteCreateOptions>
  >;
}

type ClientRequestParamsOfType<TRouteParamsRT extends RouteParamsRT> =
  TRouteParamsRT extends t.Mixed
    ? MaybeOptional<{
        params: t.OutputOf<TRouteParamsRT>;
      }>
    : {};

type DecodedRequestParamsOfType<TRouteParamsRT extends RouteParamsRT> =
  TRouteParamsRT extends t.Mixed
    ? MaybeOptional<{
        params: t.TypeOf<TRouteParamsRT>;
      }>
    : {};

export type EndpointOf<TServerRouteRepository extends ServerRouteRepository<any, any, any>> =
  TServerRouteRepository extends ServerRouteRepository<any, any, infer TRouteState>
    ? keyof TRouteState
    : never;

export type ReturnOf<
  TServerRouteRepository extends ServerRouteRepository<any, any, any>,
  TEndpoint extends EndpointOf<TServerRouteRepository>
> = TServerRouteRepository extends ServerRouteRepository<any, any, infer TRouteState>
  ? TEndpoint extends keyof TRouteState
    ? TRouteState[TEndpoint] extends ServerRoute<
        any,
        any,
        any,
        infer TReturnType,
        ServerRouteCreateOptions
      >
      ? TReturnType
      : never
    : never
  : never;

export type DecodedRequestParamsOf<
  TServerRouteRepository extends ServerRouteRepository<any, any, any>,
  TEndpoint extends EndpointOf<TServerRouteRepository>
> = TServerRouteRepository extends ServerRouteRepository<any, any, infer TRouteState>
  ? TEndpoint extends keyof TRouteState
    ? TRouteState[TEndpoint] extends ServerRoute<
        any,
        infer TRouteParamsRT,
        any,
        any,
        ServerRouteCreateOptions
      >
      ? TRouteParamsRT extends RouteParamsRT
        ? DecodedRequestParamsOfType<TRouteParamsRT>
        : {}
      : never
    : never
  : never;

export type ClientRequestParamsOf<
  TServerRouteRepository extends ServerRouteRepository<any, any, any>,
  TEndpoint extends EndpointOf<TServerRouteRepository>
> = TServerRouteRepository extends ServerRouteRepository<any, any, infer TRouteState>
  ? TEndpoint extends keyof TRouteState
    ? TRouteState[TEndpoint] extends ServerRoute<
        any,
        infer TRouteParamsRT,
        any,
        any,
        ServerRouteCreateOptions
      >
      ? TRouteParamsRT extends RouteParamsRT
        ? ClientRequestParamsOfType<TRouteParamsRT>
        : {}
      : never
    : never
  : never;

export type RouteRepositoryClient<
  TServerRouteRepository extends ServerRouteRepository<any, any, any>,
  TAdditionalClientOptions extends Record<string, any>
> = <TEndpoint extends EndpointOf<TServerRouteRepository>>(
  options: {
    endpoint: TEndpoint;
  } & ClientRequestParamsOf<TServerRouteRepository, TEndpoint> &
    TAdditionalClientOptions
) => Promise<ReturnOf<TServerRouteRepository, TEndpoint>>;
