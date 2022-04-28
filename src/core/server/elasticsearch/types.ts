/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Observable } from 'rxjs';
import { Headers } from '../http/router';
import { KibanaRequest } from '../http';
import { ElasticsearchConfig } from './elasticsearch_config';
import { IClusterClient, ICustomClusterClient, ElasticsearchClientConfig } from './client';
import { NodesVersionCompatibility } from './version_check/ensure_es_version';
import { ServiceStatus } from '../status';
import type { UnauthorizedErrorHandler } from './client/retry_unauthorized';

/**
 * @public
 */
export interface ElasticsearchServicePreboot {
  /**
   * A limited set of Elasticsearch configuration entries.
   *
   * @example
   * ```js
   * const { hosts, credentialsSpecified } = core.elasticsearch.config;
   * ```
   */
  readonly config: Readonly<ElasticsearchConfigPreboot>;

  /**
   * Create application specific Elasticsearch cluster API client with customized config. See {@link IClusterClient}.
   *
   * @param type Unique identifier of the client
   * @param clientConfig A config consists of Elasticsearch JS client options and
   * valid sub-set of Elasticsearch service config.
   * We fill all the missing properties in the `clientConfig` using the default
   * Elasticsearch config so that we don't depend on default values set and
   * controlled by underlying Elasticsearch JS client.
   * We don't run validation against the passed config and expect it to be valid.
   *
   * @example
   * ```js
   * const client = elasticsearch.createClient('my-app-name', config);
   * const data = await client.asInternalUser.search();
   * ```
   */
  readonly createClient: (
    type: string,
    clientConfig?: Partial<ElasticsearchClientConfig>
  ) => ICustomClusterClient;
}

/**
 * @public
 */
export interface ElasticsearchServiceSetup {
  /**
   * Register a handler that will be called when unauthorized (401) errors are returned from any API
   * call to elasticsearch performed on behalf of a user via a {@link IScopedClusterClient | scoped cluster client}.
   *
   * @example
   * ```ts
   * const handler: UnauthorizedErrorHandler = ({ request, error }, toolkit) => {
   *   const reauthenticationResult = await authenticator.reauthenticate(request, error);
   *   if (reauthenticationResult.succeeded()) {
   *     return toolkit.retry({
   *       authHeaders: reauthenticationResult.authHeaders,
   *     });
   *   }
   *   return toolkit.notHandled();
   * }
   *
   * coreSetup.elasticsearch.setUnauthorizedErrorHandler(handler);
   * ```
   *
   * @remarks The handler will only be invoked for scoped client bound to real {@link KibanaRequest | request} instances.
   */
  setUnauthorizedErrorHandler: (handler: UnauthorizedErrorHandler) => void;

  /**
   * @deprecated
   */
  legacy: {
    /**
     * Provide direct access to the current elasticsearch configuration.
     *
     * @deprecated Can be removed when https://github.com/elastic/kibana/issues/119862 is done.
     */
    readonly config$: Observable<ElasticsearchConfig>;
  };
}

/** @internal */
export type InternalElasticsearchServicePreboot = ElasticsearchServicePreboot;

/** @internal */
export interface InternalElasticsearchServiceSetup extends ElasticsearchServiceSetup {
  esNodesCompatibility$: Observable<NodesVersionCompatibility>;
  status$: Observable<ServiceStatus<ElasticsearchStatusMeta>>;
}

/**
 * @public
 */
export interface ElasticsearchServiceStart {
  /**
   * A pre-configured {@link IClusterClient | Elasticsearch client}
   *
   * @example
   * ```js
   * const client = core.elasticsearch.client;
   * ```
   */
  readonly client: IClusterClient;
  /**
   * Create application specific Elasticsearch cluster API client with customized config. See {@link IClusterClient}.
   *
   * @param type Unique identifier of the client
   * @param clientConfig A config consists of Elasticsearch JS client options and
   * valid sub-set of Elasticsearch service config.
   * We fill all the missing properties in the `clientConfig` using the default
   * Elasticsearch config so that we don't depend on default values set and
   * controlled by underlying Elasticsearch JS client.
   * We don't run validation against the passed config and expect it to be valid.
   *
   * @example
   * ```js
   * const client = elasticsearch.createClient('my-app-name', config);
   * const data = await client.asInternalUser.search();
   * ```
   */
  readonly createClient: (
    type: string,
    clientConfig?: Partial<ElasticsearchClientConfig>
  ) => ICustomClusterClient;
}

/**
 * @internal
 */
export type InternalElasticsearchServiceStart = ElasticsearchServiceStart;

/** @public */
export interface ElasticsearchStatusMeta {
  warningNodes: NodesVersionCompatibility['warningNodes'];
  incompatibleNodes: NodesVersionCompatibility['incompatibleNodes'];
  nodesInfoRequestError?: NodesVersionCompatibility['nodesInfoRequestError'];
}

/**
 * Fake request object created manually by Kibana plugins.
 * @public
 */
export interface FakeRequest {
  /** Headers used for authentication against Elasticsearch */
  headers: Headers;
}

/**
 A user credentials container.
 * It accommodates the necessary auth credentials to impersonate the current user.
 *
 * @public
 * See {@link KibanaRequest}.
 */
export type ScopeableRequest = KibanaRequest | FakeRequest;

/**
 * A limited set of Elasticsearch configuration entries exposed to the `preboot` plugins at `setup`.
 *
 * @public
 */
export interface ElasticsearchConfigPreboot {
  /**
   * Hosts that the client will connect to. If sniffing is enabled, this list will
   * be used as seeds to discover the rest of your cluster.
   */
  readonly hosts: string[];

  /**
   * Indicates whether Elasticsearch configuration includes credentials (`username`, `password` or `serviceAccountToken`).
   */
  readonly credentialsSpecified: boolean;
}
