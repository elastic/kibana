/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ElasticsearchClient } from './client';
import type { ScopeableRequest, ScopeableUrlRequest } from './types';
import type { IScopedClusterClient } from './scoped_cluster_client';

/**
 * Options for the `asScoped` method.
 *
 * @public
 */
export interface AsScopedOptions {
  /**
   * Controls how `project_routing` is automatically injected into Elasticsearch requests made
   * through the scoped client.
   *
   * **Background**: Cross-Project Search (CPS) is a Serverless feature that allows Kibana to
   * transparently orchestrate searches across multiple Elastic projects. Kibana itself does not
   * execute the cross-project logic - it forwards requests with the appropriate `project_routing`
   * header and Elasticsearch handles execution, security enforcement, and result aggregation.
   *
   * **Options**:
   * - `'space-npre'`: Requests are routed to the Named Project Routing Expression (NPRE) configured
   *   for the current Kibana space. Requires a {@link ScopeableUrlRequest} to be passed to
   *   `asScoped` so that the space can be extracted from the URL pathname. Use this when the scope
   *   of the query should match the data boundaries of the active space (e.g. alerting rules).
   * - `'request-header'`: The `project_routing` value is read from the `x-kbn-project-routing`
   *   HTTP header present on the incoming request. Browser-side code sets this header via the
   *   Kibana HTTP client, eliminating the need to propagate the routing value through request
   *   bodies or service layers. Falls back to origin-only routing when the header is absent.
   *
   * When no options are passed to `asScoped`, requests are always routed to the origin project
   * (i.e. the Elasticsearch instance Kibana is directly connected to).
   *
   * **Important**: This option only takes effect in CPS-enabled Serverless environments. In all
   * other environments (stateful, non-CPS Serverless), any `project_routing` params are
   * stripped from requests to avoid Elasticsearch rejections and to preserve traditional
   * single-cluster routing behavior.
   */
  projectRouting: 'space-npre' | 'request-header';
}

/**
 * {@link AsScopedOptions} variant that routes requests to the NPRE configured for the current
 * Kibana space. Requires a {@link ScopeableUrlRequest} to be passed to `asScoped` so the space
 * can be extracted from the URL pathname.
 * @public
 */
export interface SpaceNPRERouting extends AsScopedOptions {
  projectRouting: 'space-npre';
}

/**
 * {@link AsScopedOptions} variant that reads `project_routing` from the `x-kbn-project-routing`
 * HTTP header present on the incoming request. Browser-side code sets this header via the Kibana
 * HTTP client (e.g. `http.post('/api/...', { headers: { 'x-kbn-project-routing': value } })`),
 * eliminating the need to propagate the value through request bodies or service layers.
 * Falls back to origin-only routing when the header is absent.
 * @public
 */
export interface RequestHeaderRouting extends AsScopedOptions {
  projectRouting: 'request-header';
}

/**
 * Represents an Elasticsearch cluster API client created by the platform.
 * It allows to call API on behalf of the internal Kibana user and
 * the actual user that is derived from the request headers (via `asScoped(...)`).
 *
 * @public
 **/
export interface IClusterClient {
  /**
   * A {@link ElasticsearchClient | client} used to query the Elasticsearch cluster on behalf of
   * the Kibana internal user. Intended primarily for administrative and infrastructure-level
   * operations (e.g., index management, bootstrapping, health checks) rather than user-facing
   * data queries.
   *
   * In CPS-enabled Serverless environments, requests made through this client are always bound
   * to `'origin-only'` routing - they will never fan out to other CPS-connected projects.
   */
  readonly asInternalUser: ElasticsearchClient;
  /**
   * Creates a {@link IScopedClusterClient | scoped cluster client} bound to the given request,
   * forwarding the request's authentication headers to Elasticsearch.
   *
   * In CPS-enabled Serverless environments, the request will be routed to the origin project by default.
   * @param request - The incoming {@link ScopeableRequest | request} whose credentials are used
   *   to authenticate Elasticsearch calls.
   */
  asScoped(request: ScopeableRequest): IScopedClusterClient;
  /**
   * Creates a {@link IScopedClusterClient | scoped cluster client} bound to the given request,
   * forwarding the request's authentication headers to Elasticsearch.
   * Routes the request according to the options provided.
   *
   * @param request - The incoming {@link ScopeableUrlRequest | request} whose credentials are used
   *   to authenticate Elasticsearch calls.
   * @param opts - {@link AsScopedOptions | options} to configure CPS routing behavior:
   * - 'space-npre': Routes the request to the NPRE configured for the current Kibana space. The space id is extracted from the request URL.
   * - 'request-header': Routes the request to the PRE specified in the `x-kbn-project-routing` header.
   */
  asScoped(request: ScopeableUrlRequest, opts: AsScopedOptions): IScopedClusterClient;
}

/**
 * See {@link IClusterClient}
 *
 * @public
 */
export interface ICustomClusterClient extends IClusterClient {
  /**
   * Closes the cluster client. After that client cannot be used and one should
   * create a new client instance to be able to interact with Elasticsearch API.
   */
  close: () => Promise<void>;
}
