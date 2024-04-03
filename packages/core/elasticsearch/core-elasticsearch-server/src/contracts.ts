/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Observable } from 'rxjs';
import type {
  IClusterClient,
  ICustomClusterClient,
  ElasticsearchClientConfig,
  UnauthorizedErrorHandler,
} from './client';
import { IElasticsearchConfig } from './elasticsearch_config';

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
    readonly config$: Observable<IElasticsearchConfig>;
  };
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
   * Returns the capabilities for the default cluster.
   */
  getCapabilities: () => ElasticsearchCapabilities;
}

/**
 * Represent the capabilities supported by a given ES cluster.
 *
 * @public
 */
export interface ElasticsearchCapabilities {
  /**
   * Indicates whether we're connected to a serverless version of elasticsearch.
   * Required because some options aren't working for serverless and code needs to have the info to react accordingly.
   */
  serverless: boolean;
}

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
