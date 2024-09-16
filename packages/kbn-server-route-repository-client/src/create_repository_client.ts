/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreSetup, CoreStart } from '@kbn/core-lifecycle-browser';
import {
  DefaultClientOptions,
  RouteRepositoryClient,
  ServerRouteRepository,
  formatRequest,
} from '@kbn/server-route-repository-utils';
import { httpResponseIntoObservable } from '@kbn/sse-utils-client';
import { from } from 'rxjs';
import { HttpFetchQuery, HttpResponse } from '@kbn/core-http-browser';
import { omit } from 'lodash';
import { createRequestCache } from './request_cache';

export function createRepositoryClient<
  TRepository extends ServerRouteRepository,
  TClientOptions extends Record<string, any> = {}
>(core: CoreStart | CoreSetup): RouteRepositoryClient<TRepository, TClientOptions> {
  const requestCache = createRequestCache();

  const fetch = (
    endpoint: string,
    params: { path?: Record<string, string>; body?: unknown; query?: HttpFetchQuery } | undefined,
    options: TClientOptions & DefaultClientOptions
  ) => {
    const { method, pathname, version } = formatRequest(endpoint, params?.path);

    const { caching, ...otherOptions } = options;

    const body = params && params.body ? JSON.stringify(params.body) : undefined;
    const query = params?.query;

    return requestCache.fetch(
      { pathname, body, method, query },
      { mode: 'default', type: 'inMemory', ...caching },
      () =>
        core.http[method](pathname, {
          ...otherOptions,
          body,
          query,
          version,
        })
    );
  };

  return {
    fetch: (endpoint, ...args) => {
      const allOptions = args[0] ?? {};
      const params = 'params' in allOptions ? (allOptions.params as Record<string, any>) : {};
      const otherOptions = omit(allOptions, 'params') as TClientOptions;

      return fetch(endpoint, params, otherOptions) as any;
    },
    stream: (endpoint, ...args) => {
      const allOptions = args[0] ?? {};
      const params = 'params' in allOptions ? (allOptions.params as Record<string, any>) : {};
      const otherOptions = omit(allOptions, 'params') as TClientOptions;

      return from(
        fetch(endpoint, params, {
          ...otherOptions,
          asResponse: true,
          rawResponse: true,
        }) as Promise<HttpResponse>
      ).pipe(httpResponseIntoObservable()) as any;
    },
  };
}
