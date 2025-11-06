/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreSetup, CoreStart, HttpFetchOptions } from '@kbn/core/public';
import type {
  ClientRequestParamsOf,
  ReturnOf,
  RouteRepositoryClient,
} from '@kbn/server-route-repository';
import { createRepositoryClient } from '@kbn/server-route-repository-client';
import type { MetricsExperienceRouteRepository } from '../../server';

type FetchOptions = Omit<HttpFetchOptions, 'body'> & {
  body?: any;
};

export type MetricsExperienceRepositoryClientOptions = Omit<
  FetchOptions,
  'query' | 'body' | 'pathname'
>;

export type MetricsExperienceRepositoryClient = RouteRepositoryClient<
  MetricsExperienceRouteRepository,
  MetricsExperienceRepositoryClientOptions
>['fetch'];

export type MetricsExperienceRepositoryEndpoint = keyof MetricsExperienceRouteRepository;

export type APIReturnType<TEndpoint extends MetricsExperienceRepositoryEndpoint> = ReturnOf<
  MetricsExperienceRouteRepository,
  TEndpoint
>;

export type MetricsExperienceAPIClientRequestParamsOf<
  TEndpoint extends MetricsExperienceRepositoryEndpoint
> = ClientRequestParamsOf<MetricsExperienceRouteRepository, TEndpoint>;

export type MetricsExperienceClient = ReturnType<typeof createMetricsExperienceClient>;
export function createMetricsExperienceClient(core: CoreStart | CoreSetup) {
  const request = createRepositoryClient(core).fetch as MetricsExperienceRepositoryClient;

  return {
    getDimensions: (
      params: MetricsExperienceAPIClientRequestParamsOf<'GET /internal/metrics_experience/dimensions'>['params']['query'],
      signal?: AbortSignal | null
    ) =>
      request('GET /internal/metrics_experience/dimensions', {
        params: {
          query: params,
        },
        signal,
      }),
    getFields: (
      params: MetricsExperienceAPIClientRequestParamsOf<'GET /internal/metrics_experience/fields'>['params']['query'],
      signal?: AbortSignal | null
    ) =>
      request('GET /internal/metrics_experience/fields', {
        params: {
          query: params,
        },
        signal,
      }),
    searchFields: (
      params: MetricsExperienceAPIClientRequestParamsOf<'POST /internal/metrics_experience/fields/_search'>['params']['body'],
      signal?: AbortSignal | null
    ) =>
      request('POST /internal/metrics_experience/fields/_search', {
        params: {
          body: params,
        },
        signal,
      }),
  };
}
