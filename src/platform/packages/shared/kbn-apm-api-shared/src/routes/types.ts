/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RouteParamsRT, ServerRoute } from '@kbn/server-route-repository-utils';

declare const __response: unique symbol;

export interface WithResponse<T> {
  readonly [__response]: T;
}

export type ExtractResponse<T> = T extends WithResponse<infer R>
  ? R extends void
    ? void
    : R extends Record<string, any>
    ? R
    : Record<string, never>
  : Record<string, never>;

export function defineRoute<TResponse extends Record<string, any> | void | null>() {
  return <
    const TEndpoint extends string,
    TParams extends RouteParamsRT | undefined = undefined
  >(config: {
    endpoint: TEndpoint;
    params?: TParams;
  }) => config as typeof config & WithResponse<TResponse>;
}

export type BuildRepository<T extends Record<string, { endpoint: string; params?: any }>> = {
  [K in keyof T as T[K]['endpoint']]: ServerRoute<
    T[K]['endpoint'],
    T[K]['params'],
    any,
    ExtractResponse<T[K]>,
    any
  >;
};

type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void
  ? I
  : never;

export type BuildGroupedRepository<
  T extends Record<string, Record<string, { endpoint: string; params?: any }>>
> = UnionToIntersection<{ [K in keyof T]: BuildRepository<T[K]> }[keyof T]>;
