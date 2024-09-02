/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
import type { ServerSentEvent } from '@kbn/sse-utils';
import { z } from '@kbn/zod';
import * as t from 'io-ts';
import { Observable } from 'rxjs';
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

type IsInvalidObservableReturnType<TReturnType> = TReturnType extends Observable<infer TValueType>
  ? TValueType extends ServerSentEvent
    ? false
    : true
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
      handler: ({}: TRouteHandlerResources &
        (TRouteParamsRT extends RouteParamsRT
          ? DecodedRequestParamsOfType<TRouteParamsRT>
          : {})) => IsInvalidObservableReturnType<TReturnType> extends true
        ? never
        : Promise<TReturnType>;
    } & TRouteCreateOptions &
      (TRouteParamsRT extends RouteParamsRT ? { params: TRouteParamsRT } : {})
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
    : TRouteParamsRT extends z.ZodSchema
    ? MaybeOptional<{
        params: z.input<TRouteParamsRT>;
      }>
    : {};

type DecodedRequestParamsOfType<TRouteParamsRT extends RouteParamsRT> =
  TRouteParamsRT extends t.Mixed
    ? MaybeOptional<{
        params: t.TypeOf<TRouteParamsRT>;
      }>
    : TRouteParamsRT extends z.ZodType<infer TOutput>
    ? TOutput extends RouteParams
      ? MaybeOptional<{
          params: TOutput;
        }>
      : never
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
  : {};

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
      ClientRequestParamsOf<TServerRouteRepository, TEndpoint> & TAdditionalClientOptions
    >
  ): Promise<ReturnOf<TServerRouteRepository, TEndpoint>>;
  stream<TEndpoint extends Extract<keyof TServerRouteRepository, string>>(
    endpoint: TEndpoint,
    ...args: MaybeOptionalArgs<
      ClientRequestParamsOf<TServerRouteRepository, TEndpoint> & TAdditionalClientOptions
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

export interface DefaultRouteCreateOptions {
  options?: RouteConfigOptions<RouteMethod>;
}
