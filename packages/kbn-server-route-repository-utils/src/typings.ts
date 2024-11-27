/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HttpFetchOptions } from '@kbn/core-http-browser';
import type { IKibanaResponse, RouteAccess, RouteSecurity } from '@kbn/core-http-server';
import type {
  KibanaRequest,
  KibanaResponseFactory,
  Logger,
  RequestHandlerContext,
  RouteConfigOptions,
  RouteMethod,
} from '@kbn/core/server';
import type { ServerSentEvent } from '@kbn/sse-utils';
import { z } from '@kbn/zod';
import * as t from 'io-ts';
import { Observable } from 'rxjs';
import { Readable } from 'stream';
import { Required, RequiredKeys, ValuesType } from 'utility-types';

type MaybeOptional<T extends { params?: Record<string, any> }> = RequiredKeys<
  T['params']
> extends never
  ? { params?: T['params'] }
  : { params: T['params'] };

type WithoutIncompatibleMethods<T extends t.Any> = Omit<T, 'encode' | 'asEncoder'> & {
  encode: t.Encode<any, any>;
  asEncoder: () => t.Encoder<any, any>;
};

export interface RouteParams {
  path?: any;
  query?: any;
  body?: any;
}

export type ZodParamsObject = z.ZodObject<{
  path?: z.ZodSchema;
  query?: z.ZodSchema;
  body?: z.ZodSchema;
}>;

export type IoTsParamsObject = WithoutIncompatibleMethods<t.Type<RouteParams>>;

export type RouteParamsRT = IoTsParamsObject | ZodParamsObject;
export type ServerRouteHandlerResources = Record<string, any>;

export interface ServerRouteCreateOptions {
  [x: string]: any;
}

type RouteMethodOf<TEndpoint extends string> = TEndpoint extends `${infer TRouteMethod} ${string}`
  ? Lowercase<TRouteMethod> extends RouteMethod
    ? Lowercase<TRouteMethod>
    : never
  : never;

type IsPublicEndpoint<
  TEndpoint extends string,
  TRouteAccess extends RouteAccess | undefined
> = TRouteAccess extends 'public'
  ? true
  : TRouteAccess extends 'internal'
  ? false
  : TEndpoint extends `${string} /api${string}`
  ? true
  : false;

type IsVersionSpecified<TEndpoint extends string> =
  TEndpoint extends `${string} ${string} ${string}` ? true : false;

type ValidateEndpoint<
  TEndpoint extends string,
  TRouteAccess extends RouteAccess | undefined
> = IsPublicEndpoint<TEndpoint, TRouteAccess> extends true ? IsVersionSpecified<TEndpoint> : true;

type IsAny<T> = 1 | 0 extends (T extends never ? 1 : 0) ? true : false;

// this ensures only plain objects can be returned, if it's not one
// of the other allowed types. here's how it works:
// - if it's a function, it's invalid
// - if it's a primitive, it's valid
// - if it's an array, it's valid
// - if it's a record, walk it once and apply above principles
// we don't recursively walk because of circular references in object types
// we also don't check arrays, as the goal is to not be able to return
// things like classes and functions at the top level. specifically,
// this code is intended to allow for Observable<ServerSentEvent> but
// to disallow Observable<NotAServerSentEvent>.

type ValidateSerializableValue<T, TWalkRecursively extends boolean = true> = IsAny<T> extends true
  ? 1
  : T extends Function
  ? 0
  : T extends Record<string, any>
  ? TWalkRecursively extends true
    ? ValuesType<{
        [key in keyof T]: ValidateSerializableValue<T[key], false>;
      }>
    : 1
  : T extends string | number | boolean | null | undefined
  ? 1
  : T extends any[]
  ? 1
  : 0;

type GuardAgainstInvalidRecord<T> = 0 extends ValidateSerializableValue<T> ? never : T;

type ServerRouteHandlerReturnTypeWithoutRecord =
  | Observable<ServerSentEvent>
  | Readable
  | IKibanaResponse
  | string
  | number
  | boolean
  | null
  | void;

type ServerRouteHandlerReturnType = ServerRouteHandlerReturnTypeWithoutRecord | Record<string, any>;

type ServerRouteHandler<
  TRouteHandlerResources extends ServerRouteHandlerResources,
  TRouteParamsRT extends RouteParamsRT | undefined,
  TReturnType extends ServerRouteHandlerReturnType
> = (
  options: TRouteHandlerResources &
    (TRouteParamsRT extends RouteParamsRT ? DecodedRequestParamsOfType<TRouteParamsRT> : {})
) => Promise<
  TReturnType extends ServerRouteHandlerReturnTypeWithoutRecord
    ? TReturnType
    : GuardAgainstInvalidRecord<TReturnType>
>;

export type CreateServerRouteFactory<
  TRouteHandlerResources extends ServerRouteHandlerResources,
  TRouteCreateOptions extends DefaultRouteCreateOptions | undefined
> = <
  TEndpoint extends string,
  TReturnType extends ServerRouteHandlerReturnType,
  TRouteParamsRT extends RouteParamsRT | undefined = undefined,
  TRouteAccess extends RouteAccess | undefined = undefined
>(
  options: {
    endpoint: ValidateEndpoint<TEndpoint, TRouteAccess> extends true ? TEndpoint : never;
    handler: ServerRouteHandler<TRouteHandlerResources, TRouteParamsRT, TReturnType>;
    params?: TRouteParamsRT;
    security?: RouteSecurity;
  } & Required<
    {
      options?: (TRouteCreateOptions extends DefaultRouteCreateOptions ? TRouteCreateOptions : {}) &
        RouteConfigOptions<RouteMethodOf<TEndpoint>> & {
          access?: TRouteAccess;
        };
    },
    RequiredKeys<TRouteCreateOptions> extends never ? never : 'options'
  >
) => Record<
  TEndpoint,
  ServerRoute<
    TEndpoint,
    TRouteParamsRT,
    TRouteHandlerResources,
    Awaited<TReturnType>,
    TRouteCreateOptions
  >
>;

export type ServerRoute<
  TEndpoint extends string,
  TRouteParamsRT extends RouteParamsRT | undefined,
  TRouteHandlerResources extends ServerRouteHandlerResources,
  TReturnType extends ServerRouteHandlerReturnType,
  TRouteCreateOptions extends DefaultRouteCreateOptions | undefined
> = {
  endpoint: TEndpoint;
  handler: ServerRouteHandler<TRouteHandlerResources, TRouteParamsRT, TReturnType>;
  security?: RouteSecurity;
} & (TRouteParamsRT extends RouteParamsRT ? { params: TRouteParamsRT } : {}) &
  (TRouteCreateOptions extends DefaultRouteCreateOptions ? { options: TRouteCreateOptions } : {});

export type ServerRouteRepository = Record<
  string,
  ServerRoute<string, RouteParamsRT | undefined, any, any, ServerRouteCreateOptions | undefined>
>;

type ClientRequestParamsOfType<TRouteParamsRT extends RouteParamsRT> =
  TRouteParamsRT extends t.Mixed
    ? MaybeOptional<{
        params: t.OutputOf<TRouteParamsRT>;
      }>
    : TRouteParamsRT extends z.ZodSchema
    ? MaybeOptional<{
        params: z.input<TRouteParamsRT>;
      }>
    : never;

type DecodedRequestParamsOfType<TRouteParamsRT extends RouteParamsRT> =
  TRouteParamsRT extends t.Mixed
    ? MaybeOptional<{
        params: t.TypeOf<TRouteParamsRT>;
      }>
    : TRouteParamsRT extends z.ZodSchema
    ? MaybeOptional<{
        params: z.output<TRouteParamsRT>;
      }>
    : never;

export type EndpointOf<TServerRouteRepository extends ServerRouteRepository> =
  keyof TServerRouteRepository;

export type ReturnOf<
  TServerRouteRepository extends ServerRouteRepository,
  TEndpoint extends keyof TServerRouteRepository
> = TServerRouteRepository[TEndpoint] extends ServerRoute<any, any, any, infer TReturnType, any>
  ? TReturnType extends IKibanaResponse<infer TWrappedResponseType>
    ? TWrappedResponseType
    : TReturnType
  : never;

export type DecodedRequestParamsOf<
  TServerRouteRepository extends ServerRouteRepository,
  TEndpoint extends keyof TServerRouteRepository
> = TServerRouteRepository[TEndpoint] extends ServerRoute<any, infer TRouteParamsRT, any, any, any>
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
  ServerRouteCreateOptions | undefined
>
  ? TRouteParamsRT extends RouteParamsRT
    ? ClientRequestParamsOfType<TRouteParamsRT>
    : TRouteParamsRT extends undefined
    ? {}
    : never
  : never;

type MaybeOptionalArgs<T extends Record<string, any>> = RequiredKeys<T> extends never
  ? [T] | []
  : [T];

export interface RouteRepositoryClient<
  TServerRouteRepository extends ServerRouteRepository,
  TAdditionalClientOptions extends Record<string, any>
> {
  fetch<TEndpoint extends Extract<keyof TServerRouteRepository, string>>(
    endpoint: TEndpoint,
    ...args: MaybeOptionalArgs<
      ClientRequestParamsOf<TServerRouteRepository, TEndpoint> &
        TAdditionalClientOptions &
        HttpFetchOptions
    >
  ): Promise<ReturnOf<TServerRouteRepository, TEndpoint>>;
  stream<TEndpoint extends Extract<keyof TServerRouteRepository, string>>(
    endpoint: TEndpoint,
    ...args: MaybeOptionalArgs<
      ClientRequestParamsOf<TServerRouteRepository, TEndpoint> &
        TAdditionalClientOptions &
        HttpFetchOptions
    >
  ): ReturnOf<TServerRouteRepository, TEndpoint> extends Observable<infer TReturnType>
    ? TReturnType extends ServerSentEvent
      ? Observable<TReturnType>
      : never
    : never;
}

interface CoreRouteHandlerResources {
  request: KibanaRequest;
  response: KibanaResponseFactory;
  context: RequestHandlerContext;
}

export type DefaultClientOptions = HttpFetchOptions;

export interface DefaultRouteHandlerResources extends CoreRouteHandlerResources {
  logger: Logger;
}

export type DefaultRouteCreateOptions = RouteConfigOptions<Exclude<RouteMethod, 'options'>>;
