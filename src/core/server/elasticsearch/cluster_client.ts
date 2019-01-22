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

export interface CallAPIOptions {
  wrap401Errors: boolean;
}

async function callAPI(
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

export class ClusterClient {
  private readonly client: Client;
  private scopedClient?: Client;
  private isClosed = false;

  constructor(private readonly config: ElasticsearchClientConfig, private readonly log: Logger) {
    this.client = new Client(parseElasticsearchClientConfig(config, log));
  }

  public async callAsInternalUser(
    endpoint: string,
    clientParams: Record<string, unknown> = {},
    options?: CallAPIOptions
  ) {
    this.assertIsClosed();

    return await callAPI(this.client, endpoint, clientParams, options);
  }

  public asScoped(req: { headers?: Headers } = {}) {
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

    return new ScopedClusterClient(
      (...args) => this.callAsInternalUser(...args),
      async (...args) => {
        this.assertIsClosed();
        return await callAPI(this.scopedClient!, ...args);
      },
      headers
    );
  }

  public close() {
    this.client.close();

    if (this.scopedClient !== undefined) {
      this.scopedClient.close();
    }

    this.isClosed = true;
  }

  private assertIsClosed() {
    if (this.isClosed) {
      throw new Error('Cluster client cannot be used after it has been closed.');
    }
  }
}
