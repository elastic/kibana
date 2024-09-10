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
  RouteRepositoryClient,
  ServerRouteRepository,
  DefaultClientOptions,
  formatRequest,
} from '@kbn/server-route-repository-utils';

export function createRepositoryClient<
  TRepository extends ServerRouteRepository,
  TClientOptions extends Record<string, any> = DefaultClientOptions
>(core: CoreStart | CoreSetup) {
  return {
    fetch: (endpoint, optionsWithParams) => {
      const { params, ...options } = (optionsWithParams ?? { params: {} }) as unknown as {
        params?: Partial<Record<string, any>>;
      };

      const { method, pathname, version } = formatRequest(endpoint, params?.path);

      return core.http[method](pathname, {
        ...options,
        body: params && params.body ? JSON.stringify(params.body) : undefined,
        query: params?.query,
        version,
      });
    },
  } as { fetch: RouteRepositoryClient<TRepository, TClientOptions> };
}
