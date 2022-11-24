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

export interface CreateRouteDefinition<
  Inputs extends EndpointInputs,
  R,
  ClientMethod extends (arg: any) => Promise<any> = () => Promise<unknown> // Also ensure that the client is getting expected types
> {
  inputs: {
    params: Parameters<ClientMethod>[0] extends TypeOf<NonNullable<Inputs['params']>>
      ? TypeOf<NonNullable<Inputs['params']>>
      : unknown;
    query: Parameters<ClientMethod>[0] extends TypeOf<NonNullable<Inputs['query']>>
      ? TypeOf<NonNullable<Inputs['query']>>
      : unknown;
    body: Parameters<ClientMethod>[0] extends TypeOf<NonNullable<Inputs['body']>>
      ? TypeOf<NonNullable<Inputs['body']>>
      : unknown;
  };
  output: R extends Awaited<ReturnType<ClientMethod>> ? R : unknown;
}

export interface AnyEndpoint {
  inputs: {
    params: any;
    query: any;
    body: any;
  };
  output: any;
}
