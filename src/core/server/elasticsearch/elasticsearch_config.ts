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

// @ts-ignore avoid converting elasticsearch lib for now
import { ConfigOptions } from 'elasticsearch';
import { readFileSync } from 'fs';
import { noop } from 'lodash';
import url from 'url';

import { assertNever, pick } from '../../utils';
import { filterHeaders, Headers } from '../http/router/headers';
import { ClusterSchema } from './schema';

export enum ElasticsearchClusterType {
  admin = 'admin',
  data = 'data',
}

export class ElasticsearchConfig {
  public requestHeadersWhitelist: string[];

  /**
   * @internal
   */
  constructor(
    readonly clusterType: ElasticsearchClusterType,
    private readonly config: ClusterSchema
  ) {
    this.requestHeadersWhitelist = config.requestHeadersWhitelist;
  }

  /**
   * Filter given headers by requestHeadersWhitelist
   *
   * e.g.
   *
   * ```
   * elasticsearchConfigs.forType('data').filterHeaders(request.headers);
   * ```
   *
   * @param headers Full headers (for a request)
   *
   */
  public filterHeaders(headers: Headers): Headers {
    return filterHeaders(headers, this.requestHeadersWhitelist);
  }

  /**
   * Config for Elasticsearch client, e.g.
   *
   * ```
   * new elasticsearch.Client(config.toElasticsearchClientConfig())
   * ```
   *
   * @param shouldAuth Whether or not to the config should include the username
   *                   and password. Used to create a client that is not
   *                   authenticated using the config, but from each request.
   */
  public toElasticsearchClientConfig({ shouldAuth = true } = {}): ConfigOptions {
    const config: ConfigOptions = pick(this.config, ['apiVersion', 'username', 'logQueries']);

    config.pingTimeout = this.config.pingTimeout.asMilliseconds();
    config.requestTimeout = this.config.requestTimeout.asMilliseconds();

    config.keepAlive = true;

    const uri = url.parse(this.config.url);

    config.host = {
      headers: this.config.customHeaders,
      host: uri.hostname,
      path: uri.pathname,
      port: uri.port,
      protocol: uri.protocol,
      query: uri.query,
    };

    if (shouldAuth && this.config.username !== undefined && this.config.password !== undefined) {
      config.host.auth = `${this.config.username}:${this.config.password}`;
    }

    if (this.config.ssl === undefined) {
      return config;
    }

    let ssl: { [key: string]: any } = {};
    if (this.config.ssl.certificate && this.config.ssl.key) {
      ssl = {
        cert: readFileSync(this.config.ssl.certificate),
        key: readFileSync(this.config.ssl.key),
        passphrase: this.config.ssl.keyPassphrase,
      };
    }

    const verificationMode = this.config.ssl.verificationMode;

    switch (verificationMode) {
      case 'none':
        ssl.rejectUnauthorized = false;
        break;
      case 'certificate':
        ssl.rejectUnauthorized = true;

        // by default NodeJS checks the server identity
        ssl.checkServerIdentity = noop;
        break;
      case 'full':
        ssl.rejectUnauthorized = true;
        break;
      default:
        assertNever(verificationMode as never);
    }

    const ca = this.config.ssl.certificateAuthorities;
    if (ca && ca.length > 0) {
      ssl.ca = ca.map(authority => readFileSync(authority));
    }

    config.ssl = ssl;

    return config;
  }
}
