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
   * - `'origin-only'`: Requests are routed exclusively to the "origin" Elasticsearch instance
   *   (i.e., the project that Kibana is directly connected to). Use this for administrative or
   *   internal operations that must not fan out across other projects.
   * - `'space'`: Requests are routed to the Named Project Routing Expression (NPRE) configured for
   *   the current Kibana space. Requires a {@link ScopeableUrlRequest} to be passed to `asScoped`
   *   so that the space can be extracted from the URL pathname. Use this when the scope of the
   *   query should match the data boundaries of the active space.
   * - `'all'`: Requests are broadcast to all CPS-connected Elasticsearch instances. This is the
   *   broadest option and is appropriate when the intent is to search or aggregate data across
   *   all connected projects.
   *
   * **Important**: This option only takes effect in CPS-enabled Serverless environments. In all
   * other environments (stateful, non-CPS Serverless), any `project_routing` params are
   * stripped from requests to avoid Elasticsearch rejections and to preserve traditional
   * single-cluster routing behavior.
   */
  projectRouting: 'origin-only' | 'space' | 'all';
}

/**
 * {@link AsScopedOptions} variant that locks routing to the origin Elasticsearch instance.
 * Use for administrative or internal operations that must not fan out across CPS-connected projects.
 * @public
 */
export interface OriginOnlyRouting extends AsScopedOptions {
  projectRouting: 'origin-only';
}

/**
 * {@link AsScopedOptions} variant that routes requests to the NPRE configured for the current
 * Kibana space. Requires a {@link ScopeableUrlRequest} to be passed to `asScoped` so the space
 * can be extracted from the URL pathname.
 * @public
 */
export interface SpaceNPRERouting extends AsScopedOptions {
  projectRouting: 'space';
}

/**
 * {@link AsScopedOptions} variant that broadcasts requests to all CPS-connected Elasticsearch
 * instances. Use when the intent is to search or aggregate data across all available projects.
 * @public
 */
export interface AllProjectsRouting extends AsScopedOptions {
  projectRouting: 'all';
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
   * In CPS-enabled Serverless environments, the `opts` parameter controls how `project_routing`
   * is injected into outgoing requests. See {@link AsScopedOptions} for details.
   *
   * @param request - A {@link ScopeableUrlRequest} whose URL is used to extract the active space
   *   for space-level CPS routing. Accepts both a real {@link KibanaRequest} (the typical caller
   *   from route handlers) and a synthetic {@link UrlRequest}.
   * @param opts - {@link SpaceNPRERouting} options with `projectRouting` set to `'space'`.
   */
  asScoped(request: ScopeableUrlRequest, opts: SpaceNPRERouting): IScopedClusterClient;
  /**
   * Creates a {@link IScopedClusterClient | scoped cluster client} bound to the given request,
   * forwarding the request's authentication headers to Elasticsearch.
   *
   * In CPS-enabled Serverless environments, the `opts` parameter controls how `project_routing`
   * is injected into outgoing requests. See {@link AsScopedOptions} for details.
   *
   * @param request - The incoming {@link ScopeableRequest | request} whose credentials are used
   *   to authenticate Elasticsearch calls.
   * @param opts - Optional {@link AsScopedOptions | options} to configure CPS routing behavior.
   *   Defaults to `'origin-only'` when not specified.
   */
  asScoped(
    request: ScopeableRequest,
    opts?: OriginOnlyRouting | AllProjectsRouting
  ): IScopedClusterClient;
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
