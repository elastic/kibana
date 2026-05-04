/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { CoreStart } from '@kbn/core/public';
import { formatRequest, type RouteRepositoryClient } from '@kbn/server-route-repository';
import type { HttpFetchOptions } from '@kbn/core/public';
import type { SharedAPMRouteRepository } from './routes';
import type { CallApi } from './call_api';
import { callApi } from './call_api';

export type FetchOptions = Omit<HttpFetchOptions, 'body'> & {
  pathname: string;
  isCachable?: boolean;
  method?: string;
  body?: any;
};

type APMClientOptions = Omit<FetchOptions, 'query' | 'body' | 'pathname' | 'signal'> & {
  signal: AbortSignal | null;
};

export type APMClientV2 = RouteRepositoryClient<
  SharedAPMRouteRepository,
  APMClientOptions
>['fetch'];

export type AutoAbortedAPMClientV2 = RouteRepositoryClient<
  SharedAPMRouteRepository,
  Omit<APMClientOptions, 'signal'>
>['fetch'];

export function createCallApmApiV2(core: CoreStart): APMClientV2 {
  return ((endpoint, options) => {
    const { params } = options as unknown as {
      params?: Partial<Record<string, any>>;
    };

    const { method, pathname, version } = formatRequest(endpoint, params?.path);
    return callApi(core, {
      ...options,
      method,
      pathname,
      body: params?.body,
      query: params?.query,
      version,
      headers: {
        ...(options as any)?.headers,
      },
    } as unknown as Parameters<CallApi>[1]);
  }) as APMClientV2;
}
