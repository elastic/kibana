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

export type ServerRouteRepository = Record<
  string,
  ServerRoute<string, RouteParamsRT | undefined, any, any, Record<string, any>>
>;

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
  ? TReturnType
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
  TAdditionalClientOptions extends Record<string, any>
> = <TEndpoint extends keyof TServerRouteRepository>(
  endpoint: TEndpoint,
  ...args: MaybeOptionalArgs<
    ClientRequestParamsOf<TServerRouteRepository, TEndpoint> & TAdditionalClientOptions
  >
) => Promise<ReturnOf<TServerRouteRepository, TEndpoint>>;
