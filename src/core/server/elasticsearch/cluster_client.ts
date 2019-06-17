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

import Boom from 'boom';
import { Client } from 'elasticsearch';
import { get } from 'lodash';
import { filterHeaders, Headers } from '../http/router';
import { Logger } from '../logging';
import {
  ElasticsearchClientConfig,
  parseElasticsearchClientConfig,
} from './elasticsearch_client_config';
import { ScopedClusterClient } from './scoped_cluster_client';

/**
 * The set of options that defines how API call should be made and result be
 * processed.
 *
 * @public
 */
export interface CallAPIOptions {
  /**
   * Indicates whether `401 Unauthorized` errors returned from the Elasticsearch API
   * should be wrapped into `Boom` error instances with properly set `WWW-Authenticate`
   * header that could have been returned by the API itself. If API didn't specify that
   * then `Basic realm="Authorization Required"` is used as `WWW-Authenticate`.
   */
  wrap401Errors: boolean;
  /**
   * A signal object that allows you to abort the request via an AbortController object.
   */
  signal?: AbortSignal;
}

/**
 * Calls the Elasticsearch API endpoint with the specified parameters.
 * @param client Raw Elasticsearch JS client instance to use.
 * @param endpoint Name of the API endpoint to call.
 * @param clientParams Parameters that will be directly passed to the
 * Elasticsearch JS client.
 * @param options Options that affect the way we call the API and process the result.
 */
async function callAPI(
  client: Client,
  endpoint: string,
  clientParams: Record<string, unknown> = {},
  options: CallAPIOptions = { wrap401Errors: true }
): Promise<any> {
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

    const boomError = Boom.boomify(err, { statusCode: err.statusCode });
    const wwwAuthHeader: string = get(err, 'body.error.header[WWW-Authenticate]');

    boomError.output.headers['WWW-Authenticate'] =
      wwwAuthHeader || 'Basic realm="Authorization Required"';

    throw boomError;
  }
}

/**
 * Represents an Elasticsearch cluster API client and allows to call API on behalf
 * of the internal Kibana user and the actual user that is derived from the request
 * headers (via `asScoped(...)`).
 *
 * @public
 */
export class ClusterClient {
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

  constructor(private readonly config: ElasticsearchClientConfig, private readonly log: Logger) {
    this.client = new Client(parseElasticsearchClientConfig(config, log));
  }

  /**
   * Calls specified endpoint with provided clientParams on behalf of the
   * Kibana internal user.
   * @param endpoint - String descriptor of the endpoint e.g. `cluster.getSettings` or `ping`.
   * @param clientParams - A dictionary of parameters that will be passed directly to the Elasticsearch JS client.
   * @param options - Options that affect the way we call the API and process the result.
   */
  public callAsInternalUser = async (
    endpoint: string,
    clientParams: Record<string, unknown> = {},
    options?: CallAPIOptions
  ) => {
    this.assertIsNotClosed();

    return await callAPI(this.client, endpoint, clientParams, options);
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
   * Creates an instance of `ScopedClusterClient` based on the configuration the
   * current cluster client that exposes additional `callAsCurrentUser` method
   * scoped to the provided req. Consumers shouldn't worry about closing
   * scoped client instances, these will be automatically closed as soon as the
   * original cluster client isn't needed anymore and closed.
   * @param req - Request the `ScopedClusterClient` instance will be scoped to.
   */
  public asScoped(req: { headers?: Headers } = {}) {
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

    const headers = req.headers
      ? filterHeaders(req.headers, this.config.requestHeadersWhitelist)
      : req.headers;

    return new ScopedClusterClient(this.callAsInternalUser, this.callAsCurrentUser, headers);
  }

  /**
   * Calls specified endpoint with provided clientParams on behalf of the
   * user initiated request to the Kibana server (via HTTP request headers).
   * @param endpoint - String descriptor of the endpoint e.g. `cluster.getSettings` or `ping`.
   * @param clientParams - A dictionary of parameters that will be passed directly to the Elasticsearch JS client.
   * @param options - Options that affect the way we call the API and process the result.
   */
  private callAsCurrentUser = async (
    endpoint: string,
    clientParams: Record<string, unknown> = {},
    options?: CallAPIOptions
  ) => {
    this.assertIsNotClosed();

    return await callAPI(this.scopedClient!, endpoint, clientParams, options);
  };

  private assertIsNotClosed() {
    if (this.isClosed) {
      throw new Error('Cluster client cannot be used after it has been closed.');
    }
  }
}
