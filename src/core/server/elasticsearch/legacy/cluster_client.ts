/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import { Client } from 'elasticsearch';
import { get } from 'lodash';

import { LegacyElasticsearchErrorHelpers } from './errors';
import { GetAuthHeaders, KibanaRequest, isKibanaRequest, isRealRequest } from '../../http';
import { AuditorFactory } from '../../audit_trail';
import { filterHeaders, ensureRawRequest } from '../../http/router';
import { Logger } from '../../logging';
import { ScopeableRequest } from '../types';
import {
  LegacyElasticsearchClientConfig,
  parseElasticsearchClientConfig,
} from './elasticsearch_client_config';
import { LegacyScopedClusterClient, ILegacyScopedClusterClient } from './scoped_cluster_client';
import { LegacyCallAPIOptions, LegacyAPICaller } from './api_types';

/**
 * Support Legacy platform request for the period of migration.
 *
 * @public
 */

const noop = () => undefined;

/**
 * Calls the Elasticsearch API endpoint with the specified parameters.
 * @param client Raw Elasticsearch JS client instance to use.
 * @param endpoint Name of the API endpoint to call.
 * @param clientParams Parameters that will be directly passed to the
 * Elasticsearch JS client.
 * @param options Options that affect the way we call the API and process the result.
 */
const callAPI = async (
  client: Client,
  endpoint: string,
  clientParams: Record<string, any> = {},
  options: LegacyCallAPIOptions = { wrap401Errors: true }
) => {
  const clientPath = endpoint.split('.');
  const api: any = get(client, clientPath);
  if (!api) {
    throw new Error(`called with an invalid endpoint: ${endpoint}`);
  }

  const apiContext = clientPath.length === 1 ? client : get(client, clientPath.slice(0, -1));
  try {
    return await new Promise((resolve, reject) => {
      const request = api.call(apiContext, clientParams);
      if (options.signal) {
        options.signal.addEventListener('abort', () => {
          request.abort();
          reject(new Error('Request was aborted'));
        });
      }
      return request.then(resolve, reject);
    });
  } catch (err) {
    if (!options.wrap401Errors || err.statusCode !== 401) {
      throw err;
    }

    throw LegacyElasticsearchErrorHelpers.decorateNotAuthorizedError(err);
  }
};

/**
 * Represents an Elasticsearch cluster API client created by the platform.
 * It allows to call API on behalf of the internal Kibana user and
 * the actual user that is derived from the request headers (via `asScoped(...)`).
 *
 * See {@link LegacyClusterClient}.
 *
 * @deprecated Use {@link IClusterClient}.
 * @public
 */
export type ILegacyClusterClient = Pick<LegacyClusterClient, 'callAsInternalUser' | 'asScoped'>;

/**
 * Represents an Elasticsearch cluster API client created by a plugin.
 * It allows to call API on behalf of the internal Kibana user and
 * the actual user that is derived from the request headers (via `asScoped(...)`).
 *
 * See {@link LegacyClusterClient}.
 * @deprecated Use {@link ICustomClusterClient}.
 * @public
 */
export type ILegacyCustomClusterClient = Pick<
  LegacyClusterClient,
  'callAsInternalUser' | 'close' | 'asScoped'
>;

/**
 * {@inheritDoc IClusterClient}
 * @deprecated Use {@link IClusterClient}.
 * @public
 */
export class LegacyClusterClient implements ILegacyClusterClient {
  /**
   * Raw Elasticsearch JS client that acts on behalf of the Kibana internal user.
   */
  private readonly client: Client;

  /**
   * Optional raw Elasticsearch JS client that is shared between all the scoped clients created
   * from this cluster client. Every API call is attributed by the wh
   */
  private scopedClient?: Client;

  /**
   * Indicates whether this cluster client (and all internal raw Elasticsearch JS clients) has been closed.
   */
  private isClosed = false;

  constructor(
    private readonly config: LegacyElasticsearchClientConfig,
    private readonly log: Logger,
    private readonly getAuditorFactory: () => AuditorFactory,
    private readonly getAuthHeaders: GetAuthHeaders = noop
  ) {
    this.client = new Client(parseElasticsearchClientConfig(config, log));
  }

  /**
   * Calls specified endpoint with provided clientParams on behalf of the
   * Kibana internal user.
   * See {@link LegacyAPICaller}.
   *
   * @param endpoint - String descriptor of the endpoint e.g. `cluster.getSettings` or `ping`.
   * @param clientParams - A dictionary of parameters that will be passed directly to the Elasticsearch JS client.
   * @param options - Options that affect the way we call the API and process the result.
   */
  public callAsInternalUser: LegacyAPICaller = async (
    endpoint: string,
    clientParams: Record<string, any> = {},
    options?: LegacyCallAPIOptions
  ) => {
    this.assertIsNotClosed();

    return await (callAPI.bind(null, this.client) as LegacyAPICaller)(
      endpoint,
      clientParams,
      options
    );
  };

  /**
   * Closes the cluster client. After that client cannot be used and one should
   * create a new client instance to be able to interact with Elasticsearch API.
   */
  public close() {
    if (this.isClosed) {
      return;
    }

    this.isClosed = true;
    this.client.close();

    if (this.scopedClient !== undefined) {
      this.scopedClient.close();
    }
  }

  /**
   * Creates an instance of {@link ILegacyScopedClusterClient} based on the configuration the
   * current cluster client that exposes additional `callAsCurrentUser` method
   * scoped to the provided req. Consumers shouldn't worry about closing
   * scoped client instances, these will be automatically closed as soon as the
   * original cluster client isn't needed anymore and closed.
   *
   * @param request - Request the `IScopedClusterClient` instance will be scoped to.
   * Supports request optionality, Legacy.Request & FakeRequest for BWC with LegacyPlatform
   */
  public asScoped(request?: ScopeableRequest): ILegacyScopedClusterClient {
    // It'd have been quite expensive to create and configure client for every incoming
    // request since it involves parsing of the config, reading of the SSL certificate and
    // key files etc. Moreover scoped client needs two Elasticsearch JS clients at the same
    // time: one to support `callAsInternalUser` and another one for `callAsCurrentUser`.
    // To reduce that overhead we create one scoped client per cluster client and share it
    // between all scoped client instances.
    if (this.scopedClient === undefined) {
      this.scopedClient = new Client(
        parseElasticsearchClientConfig(this.config, this.log, {
          auth: false,
          ignoreCertAndKey: !this.config.ssl || !this.config.ssl.alwaysPresentCertificate,
        })
      );
    }

    return new LegacyScopedClusterClient(
      this.callAsInternalUser,
      this.callAsCurrentUser,
      filterHeaders(this.getHeaders(request), [
        'x-opaque-id',
        ...this.config.requestHeadersWhitelist,
      ]),
      this.getScopedAuditor(request)
    );
  }

  private getScopedAuditor(request?: ScopeableRequest) {
    // TODO: support alternative credential owners from outside of Request context in #39430
    if (request && isRealRequest(request)) {
      const kibanaRequest = isKibanaRequest(request) ? request : KibanaRequest.from(request);
      const auditorFactory = this.getAuditorFactory();
      return auditorFactory.asScoped(kibanaRequest);
    }
  }

  /**
   * Calls specified endpoint with provided clientParams on behalf of the
   * user initiated request to the Kibana server (via HTTP request headers).
   * See {@link LegacyAPICaller}.
   *
   * @param endpoint - String descriptor of the endpoint e.g. `cluster.getSettings` or `ping`.
   * @param clientParams - A dictionary of parameters that will be passed directly to the Elasticsearch JS client.
   * @param options - Options that affect the way we call the API and process the result.
   */
  private callAsCurrentUser: LegacyAPICaller = async (
    endpoint: string,
    clientParams: Record<string, any> = {},
    options?: LegacyCallAPIOptions
  ) => {
    this.assertIsNotClosed();

    return await (callAPI.bind(null, this.scopedClient!) as LegacyAPICaller)(
      endpoint,
      clientParams,
      options
    );
  };

  private assertIsNotClosed() {
    if (this.isClosed) {
      throw new Error('Cluster client cannot be used after it has been closed.');
    }
  }

  private getHeaders(request?: ScopeableRequest): Record<string, string | string[] | undefined> {
    if (!isRealRequest(request)) {
      return request && request.headers ? request.headers : {};
    }
    const authHeaders = this.getAuthHeaders(request);
    const requestHeaders = ensureRawRequest(request).headers;
    const requestIdHeaders = isKibanaRequest(request) ? { 'x-opaque-id': request.id } : {};

    return { ...requestHeaders, ...requestIdHeaders, ...authHeaders };
  }
}
