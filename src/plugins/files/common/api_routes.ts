/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { TypeOf, Type } from '@kbn/config-schema';
import { PLUGIN_ID } from './constants';

export const API_BASE_PATH = `/api/${PLUGIN_ID}`;

export const FILES_API_BASE_PATH = `${API_BASE_PATH}/files`;

export const FILES_SHARE_API_BASE_PATH = `${API_BASE_PATH}/shares`;

export const FILES_PUBLIC_API_BASE_PATH = `${API_BASE_PATH}/public`;

export interface EndpointInputs<
  P extends Type<unknown> = Type<unknown>,
  Q extends Type<unknown> = Type<unknown>,
  B extends Type<unknown> = Type<unknown>
> {
  params?: P;
  query?: Q;
  body?: B;
}

type Extends<X, Y> = X extends Y ? Y : unknown;

/**
 * Use this when creating file service endpoints to ensure that the client methods
 * are receiving the types they expect as well as providing the expected inputs.
 *
 * For example, consider create route:
 *
 * const rt = configSchema.object({...});
 *
 * export type Endpoint<M = unknown> = CreateRouteDefinition<
 *   typeof rt,              // We pass in our runtime types
 *   { file: FileJSON<M> },  // We pass in return type
 *   FilesClient['create']   // We pass in client method
 * >;
 *
 * This will return `unknown` for param, query or body if client-server types
 * are out-of-sync.
 *
 * The very best would be if the client was auto-generated from the server
 * endpoint declarations.
 */
export interface CreateRouteDefinition<
  Inputs extends EndpointInputs,
  R,
  ClientMethod extends (arg: any) => Promise<any> = () => Promise<unknown>
> {
  inputs: {
    params: Extends<Parameters<ClientMethod>[0], TypeOf<NonNullable<Inputs['params']>>>;
    query: Extends<Parameters<ClientMethod>[0], TypeOf<NonNullable<Inputs['query']>>>;
    body: Extends<Parameters<ClientMethod>[0], TypeOf<NonNullable<Inputs['body']>>>;
  };
  output: Extends<R, Awaited<ReturnType<ClientMethod>>>;
}

export interface AnyEndpoint {
  inputs: {
    params: any;
    query: any;
    body: any;
  };
  output: any;
}
