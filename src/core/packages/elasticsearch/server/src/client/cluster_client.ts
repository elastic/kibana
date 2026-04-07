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
 * **Background**: Cross-Project Search (CPS) is a Serverless feature that allows Kibana to
 * transparently orchestrate searches across multiple Elastic projects. Kibana itself does not
 * execute the cross-project logic - it forwards requests with the appropriate `project_routing`
 * parameter and Elasticsearch handles execution, security enforcement, and result aggregation.
 *
 * **Important**: These options only take effect in CPS-enabled Serverless environments. In all
 * other environments (stateful, non-CPS Serverless), any `project_routing` params are
 * stripped from requests to avoid Elasticsearch rejections and to preserve traditional
 * single-cluster routing behavior.
 *
 * @public
 */
export interface AsScopedOptions {
  /**
   * Controls how `project_routing` is automatically injected into Elasticsearch requests made
   * through the scoped client.
   *
   * - `'space'`: Routes requests to the Named Project Routing Expression (NPRE) configured for
   *   the current Kibana space. Requires a {@link ScopeableUrlRequest} to be passed to `asScoped`
   *   so that the space can be extracted from the URL pathname. Use this when the scope of the
   *   query should match the data boundaries of the active space (e.g. alerting rules).
   */
  projectRouting: 'space';
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
   * forwarding the request's authentication headers to Elasticsearch, with CPS space routing.
   *
   * Requires a {@link ScopeableUrlRequest} so the space id can be extracted from the URL pathname.
   *
   * @param request - The incoming Kibana request.
   * @param opts - {@link AsScopedOptions} that configure CPS routing behavior.
   */
  asScoped(request: ScopeableUrlRequest, opts: AsScopedOptions): IScopedClusterClient;
  /**
   * Creates a {@link IScopedClusterClient | scoped cluster client} bound to the given request,
   * forwarding the request's authentication headers to Elasticsearch with origin-only routing.
   *
   * @param request - The incoming request whose credentials authenticate Elasticsearch calls.
   */
  asScoped(request: ScopeableRequest): IScopedClusterClient;
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
