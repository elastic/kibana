/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Observable } from 'rxjs';
import { Headers } from '../http/router';
import { LegacyRequest, KibanaRequest } from '../http';
import { ElasticsearchConfig } from './elasticsearch_config';
import {
  LegacyElasticsearchClientConfig,
  ILegacyClusterClient,
  ILegacyCustomClusterClient,
} from './legacy';
import { IClusterClient, ICustomClusterClient, ElasticsearchClientConfig } from './client';
import { NodesVersionCompatibility } from './version_check/ensure_es_version';
import { ServiceStatus } from '../status';

/**
 * @public
 */
export interface ElasticsearchServiceSetup {
  /**
   * @deprecated
   * Use {@link ElasticsearchServiceStart.legacy} instead.
   */
  legacy: {
    /**
     * Provide direct access to the current elasticsearch configuration.
     *
     * @deprecated this will be removed in a later version.
     */
    readonly config$: Observable<ElasticsearchConfig>;
    /**
     * @deprecated
     * Use {@link ElasticsearchServiceStart.legacy | ElasticsearchServiceStart.legacy.createClient} instead.
     *
     * Create application specific Elasticsearch cluster API client with customized config. See {@link ILegacyClusterClient}.
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
     * const client = elasticsearch.createCluster('my-app-name', config);
     * const data = await client.callAsInternalUser();
     * ```
     */
    readonly createClient: (
      type: string,
      clientConfig?: Partial<LegacyElasticsearchClientConfig>
    ) => ILegacyCustomClusterClient;

    /**
     * @deprecated
     * Use {@link ElasticsearchServiceStart.legacy | ElasticsearchServiceStart.legacy.client} instead.
     *
     * All Elasticsearch config value changes are processed under the hood.
     * See {@link ILegacyClusterClient}.
     *
     * @example
     * ```js
     * const client = core.elasticsearch.legacy.client;
     * ```
     */
    readonly client: ILegacyClusterClient;
  };
}

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

  /**
   * @deprecated
   * Provided for the backward compatibility.
   * Switch to the new elasticsearch client as soon as https://github.com/elastic/kibana/issues/35508 done.
   * */
  legacy: {
    /**
     * Provide direct access to the current elasticsearch configuration.
     *
     * @deprecated this will be removed in a later version.
     */
    readonly config$: Observable<ElasticsearchConfig>;
    /**
     * Create application specific Elasticsearch cluster API client with customized config. See {@link ILegacyClusterClient}.
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
     * const client = elasticsearch.legacy.createClient('my-app-name', config);
     * const data = await client.callAsInternalUser();
     * ```
     */
    readonly createClient: (
      type: string,
      clientConfig?: Partial<LegacyElasticsearchClientConfig>
    ) => ILegacyCustomClusterClient;

    /**
     * A pre-configured {@link ILegacyClusterClient | legacy Elasticsearch client}.
     *
     * @example
     * ```js
     * const client = core.elasticsearch.legacy.client;
     * ```
     */
    readonly client: ILegacyClusterClient;
  };
}

/**
 * @internal
 */
export type InternalElasticsearchServiceStart = ElasticsearchServiceStart;

/** @public */
export interface ElasticsearchStatusMeta {
  warningNodes: NodesVersionCompatibility['warningNodes'];
  incompatibleNodes: NodesVersionCompatibility['incompatibleNodes'];
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
export type ScopeableRequest = KibanaRequest | LegacyRequest | FakeRequest;
