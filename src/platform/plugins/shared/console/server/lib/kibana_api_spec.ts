/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RegisteredRouteInfo, RegisteredRouteQueryParameter } from '@kbn/core/server';
import type { DefinitionUrlParams, EndpointDescription } from '../../common/types';

const KIBANA_API_NAME = 'kibana';

/**
 * Autocomplete definitions for the Kibana API, shaped the same way Console's
 * Elasticsearch definitions are (so the client can reuse the same matcher engine).
 */
export interface KibanaApiSpec {
  name: string;
  globals: Record<string, unknown>;
  endpoints: Record<string, EndpointDescription>;
}

export interface BuildKibanaApiSpecOptions {
  /**
   * Include routes registered as `access: 'internal'`. Internal routes have no
   * stability contract and would drown out the public surface, so they are
   * excluded by default.
   */
  includeInternal?: boolean;
}

/**
 * Normalizes a registered route path into a Console URL pattern.
 *
 * Console patterns are matched after splitting on `/` and dropping empty tokens,
 * and Elasticsearch patterns are stored without a leading slash (e.g. `_search`,
 * `{index}/_search`). Kibana route paths always start with `/`, so we strip it to
 * keep both sources consistent. Path parameters already use the `{param}` syntax
 * that the matcher understands.
 */
const toPattern = (path: string): string => path.replace(/^\/+/, '');

/**
 * A boolean query parameter, surfaced by Console as a `true`/`false` flag.
 */
const FLAG = '__flag__';

/**
 * Converts a route's query parameters into Console's `url_params` shape, which the
 * autocomplete engine consumes:
 * - an array of strings offers a closed set of values (enumerations),
 * - the `__flag__` sentinel offers `true`/`false`,
 * - an empty string is a free-form parameter (name only, no value suggestions).
 */
const toUrlParams = (
  queryParams: RegisteredRouteQueryParameter[] | undefined
): DefinitionUrlParams | undefined => {
  if (!queryParams || queryParams.length === 0) {
    return undefined;
  }

  const urlParams: DefinitionUrlParams = {};
  for (const { name, options, flag } of queryParams) {
    if (flag) {
      urlParams[name] = FLAG;
    } else if (options && options.length > 0) {
      urlParams[name] = options;
    } else {
      urlParams[name] = '';
    }
  }

  return urlParams;
};

/**
 * Builds Console autocomplete definitions for the Kibana API from the routes
 * registered with core's HTTP service.
 *
 * Routes sharing the same path are merged into a single endpoint with the union
 * of their HTTP methods, mirroring how Elasticsearch definitions are structured.
 */
export const buildKibanaApiSpec = (
  routes: RegisteredRouteInfo[],
  { includeInternal = false }: BuildKibanaApiSpecOptions = {}
): KibanaApiSpec => {
  const endpoints: Record<string, EndpointDescription> = {};

  for (const route of routes) {
    if (!includeInternal && route.access !== 'public') {
      continue;
    }

    const pattern = toPattern(route.path);
    // Skip the root path: it has no segments to complete and the matcher splits
    // on `/`, so an empty pattern would produce no useful suggestions.
    if (!pattern) {
      continue;
    }

    const method = route.method.toUpperCase();
    const urlParams = toUrlParams(route.queryParams);
    const existing = endpoints[pattern];

    if (existing) {
      if (!existing.methods!.includes(method)) {
        existing.methods!.push(method);
      }
      // Routes sharing a path may declare different query parameters per method, so
      // accumulate the union across all of them.
      if (urlParams) {
        existing.url_params = { ...existing.url_params, ...urlParams };
      }
    } else {
      endpoints[pattern] = {
        patterns: [pattern],
        methods: [method],
        ...(urlParams ? { url_params: urlParams } : {}),
      };
    }
  }

  return { name: KIBANA_API_NAME, globals: {}, endpoints };
};
