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
import { filterHeaders } from '../http/router/headers';
import { Logger } from '../logging';
import {
  ElasticsearchClientConfig,
  parseElasticsearchClientConfig,
} from './elasticsearch_client_config';

/* @internal */
interface CallAPIOptions {
  wrap401Errors: boolean;
}

export class ClusterClient {
  private static async callAPI(
    client: Client,
    endpoint: string,
    clientParams: Record<string, unknown> = {},
    options: CallAPIOptions = { wrap401Errors: true }
  ) {
    const clientPath = endpoint.split('.');
    const api: any = get(client, clientPath);
    if (!api) {
      throw new Error(`called with an invalid endpoint: ${endpoint}`);
    }

    const apiContext = clientPath.length === 1 ? client : get(client, clientPath.slice(0, -1));
    try {
      return await api.call(apiContext, clientParams);
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

  private readonly client: Client;
  private readonly noAuthClient: Client;

  constructor(private readonly config: ElasticsearchClientConfig, log: Logger) {
    this.client = new Client(parseElasticsearchClientConfig(config, log));

    this.noAuthClient = new Client(
      parseElasticsearchClientConfig(config, log, {
        auth: false,
        ignoreCertAndKey: !config.ssl || !config.ssl.alwaysPresentCertificate,
      })
    );
  }

  public callWithInternalUser = (
    endpoint: string,
    clientParams: Record<string, unknown> = {},
    options: CallAPIOptions
  ) => {
    return ClusterClient.callAPI(this.client, endpoint, clientParams, options);
  };

  public callWithRequest = (
    req: { headers?: Record<string, string> } = {},
    endpoint: string,
    clientParams: Record<string, unknown> = {},
    options?: CallAPIOptions
  ) => {
    if (req.headers) {
      clientParams.headers = filterHeaders(req.headers, this.config.requestHeadersWhitelist);
    }

    return ClusterClient.callAPI(this.noAuthClient, endpoint, clientParams, options);
  };

  public close() {
    this.client.close();
    this.noAuthClient.close();
  }
}
