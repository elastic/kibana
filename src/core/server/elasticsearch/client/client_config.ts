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

import { ConnectionOptions as TlsConnectionOptions } from 'tls';
import { URL } from 'url';
import { Duration } from 'moment';
import { ClientOptions, NodeOptions } from '@elastic/elasticsearch';
import { ElasticsearchConfig } from '../elasticsearch_config';

/**
 * Configuration options to be used to create a {@link IClusterClient | cluster client} using the
 * {@link ElasticsearchServiceStart.createClient | createClient API}
 *
 * @public
 */
export type ElasticsearchClientConfig = Pick<
  ElasticsearchConfig,
  | 'customHeaders'
  | 'logQueries'
  | 'sniffOnStart'
  | 'sniffOnConnectionFault'
  | 'requestHeadersWhitelist'
  | 'sniffInterval'
  | 'hosts'
  | 'username'
  | 'password'
> & {
  pingTimeout?: ElasticsearchConfig['pingTimeout'] | ClientOptions['pingTimeout'];
  requestTimeout?: ElasticsearchConfig['requestTimeout'] | ClientOptions['requestTimeout'];
  ssl?: Partial<ElasticsearchConfig['ssl']>;
  keepAlive?: boolean;
};

/**
 * Parse the client options from given client config and `scoped` flag.
 *
 * @param config The config to generate the client options from.
 * @param scoped if true, will adapt the configuration to be used by a scoped client
 *        (will remove basic auth and ssl certificates)
 */
export function parseClientOptions(
  config: ElasticsearchClientConfig,
  scoped: boolean
): ClientOptions {
  const clientOptions: ClientOptions = {
    sniffOnStart: config.sniffOnStart,
    sniffOnConnectionFault: config.sniffOnConnectionFault,
    headers: config.customHeaders,
  };

  if (config.pingTimeout != null) {
    clientOptions.pingTimeout = getDurationAsMs(config.pingTimeout);
  }
  if (config.requestTimeout != null) {
    clientOptions.requestTimeout = getDurationAsMs(config.requestTimeout);
  }
  if (config.sniffInterval != null) {
    clientOptions.sniffInterval =
      typeof config.sniffInterval === 'boolean'
        ? config.sniffInterval
        : getDurationAsMs(config.sniffInterval);
  }
  if (config.keepAlive) {
    clientOptions.agent = {
      keepAlive: config.keepAlive,
    };
  }

  if (config.username && config.password && !scoped) {
    clientOptions.auth = {
      username: config.username,
      password: config.password,
    };
  }

  clientOptions.nodes = config.hosts.map((host) => convertHost(host, !scoped, config));

  if (config.ssl) {
    clientOptions.ssl = generateSslConfig(
      config.ssl,
      scoped && !config.ssl.alwaysPresentCertificate
    );
  }

  return clientOptions;
}

const generateSslConfig = (
  sslConfig: Required<ElasticsearchClientConfig>['ssl'],
  ignoreCertAndKey: boolean
): TlsConnectionOptions => {
  const ssl: TlsConnectionOptions = {
    ca: sslConfig.certificateAuthorities,
  };

  const verificationMode = sslConfig.verificationMode;
  switch (verificationMode) {
    case 'none':
      ssl.rejectUnauthorized = false;
      break;
    case 'certificate':
      ssl.rejectUnauthorized = true;
      // by default, NodeJS is checking the server identify
      ssl.checkServerIdentity = () => undefined;
      break;
    case 'full':
      ssl.rejectUnauthorized = true;
      break;
    default:
      throw new Error(`Unknown ssl verificationMode: ${verificationMode}`);
  }

  // Add client certificate and key if required by elasticsearch
  if (!ignoreCertAndKey && sslConfig.certificate && sslConfig.key) {
    ssl.cert = sslConfig.certificate;
    ssl.key = sslConfig.key;
    ssl.passphrase = sslConfig.keyPassphrase;
  }

  return ssl;
};

const convertHost = (
  host: string,
  needAuth: boolean,
  { username, password }: ElasticsearchClientConfig
): NodeOptions => {
  const url = new URL(host);
  const isHTTPS = url.protocol === 'https:';
  url.port = url.port || (isHTTPS ? '443' : '80');
  if (needAuth && username && password) {
    url.username = username;
    url.password = password;
  }

  return {
    url,
  };
};

const getDurationAsMs = (duration: number | Duration) =>
  typeof duration === 'number' ? duration : duration.asMilliseconds();
