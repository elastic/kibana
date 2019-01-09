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

import { TypeOf } from '@kbn/config-schema';
import { ConfigOptions } from 'elasticsearch';
import { readFileSync } from 'fs';
import { pick } from 'lodash';
import { checkServerIdentity } from 'tls';
import url from 'url';
import util from 'util';
import { Logger } from '../logging';
import { ElasticsearchConfig } from './elasticsearch_config';

const readFile = (file: string) => readFileSync(file, 'utf8');

export type ClusterClientConfigOptions = Partial<
  // We don't extract timeout types from config schema as they are `Duration`, but
  // Elasticsearch client expects numbers so we need a conversion step.
  Pick<
    TypeOf<typeof ElasticsearchConfig.schema>,
    | 'apiVersion'
    | 'customHeaders'
    | 'logQueries'
    | 'hosts'
    | 'ssl'
    | 'sniffOnStart'
    | 'sniffOnConnectionFault'
    | 'username'
    | 'password'
  >
> &
  Pick<ConfigOptions, 'keepAlive' | 'log' | 'plugins' | 'pingTimeout' | 'requestTimeout'> &
  // We don't extract `sniffInterval` from `ConfigOptions` since it's defined there as `number`,
  // but it can be `false` per config schema and still processed correctly by Elasticsearch client.
  Partial<{ auth: boolean; sniffInterval: false | number }>;

// Original `ConfigOptions` defines `ssl: object` so we need something more
// specific.
export type ExtendedConfigOptions = ConfigOptions & {
  ssl: {
    rejectUnauthorized?: boolean;
    checkServerIdentity?: typeof checkServerIdentity;
    ca?: string[];
    cert?: string;
    key?: string;
    passphrase?: string;
  };
};

export function getClusterClientConfig(
  serverConfig: ClusterClientConfigOptions,
  { ignoreCertAndKey = false } = {}
) {
  const configKeysToPassAsIs: Array<keyof ClusterClientConfigOptions> = [
    'plugins',
    'apiVersion',
    'keepAlive',
    'pingTimeout',
    'requestTimeout',
    'log',
    'logQueries',
    'sniffOnStart',
    'sniffInterval',
    'sniffOnConnectionFault',
  ];

  const config: ExtendedConfigOptions = {
    keepAlive: true,
    ...pick(serverConfig, configKeysToPassAsIs),
  };

  if (Array.isArray(serverConfig.hosts)) {
    const needsAuth = serverConfig.auth !== false && serverConfig.username && serverConfig.password;
    config.hosts = serverConfig.hosts.map((nodeUrl: string) => {
      const uri = url.parse(nodeUrl);

      const httpsURI = uri.protocol === 'https:';
      const httpURI = uri.protocol === 'http:';
      const protocolPort = (httpsURI && '443') || (httpURI && '80');

      const host: Record<string, unknown> = {
        host: uri.hostname,
        port: uri.port || protocolPort,
        protocol: uri.protocol,
        path: uri.pathname,
        query: uri.query,
        headers: serverConfig.customHeaders,
      };

      if (needsAuth) {
        host.auth = util.format('%s:%s', serverConfig.username, serverConfig.password);
      }
    });
  }

  if (serverConfig.ssl === undefined) {
    return config;
  }

  config.ssl = {};

  const verificationMode = serverConfig.ssl.verificationMode;
  switch (verificationMode) {
    case 'none':
      config.ssl.rejectUnauthorized = false;
      break;
    case 'certificate':
      config.ssl.rejectUnauthorized = true;

      // by default, NodeJS is checking the server identify
      config.ssl.checkServerIdentity = () => undefined;
      break;
    case 'full':
      config.ssl.rejectUnauthorized = true;
      break;
    default:
      throw new Error(`Unknown ssl verificationMode: ${verificationMode}`);
  }

  if (
    Array.isArray(serverConfig.ssl.certificateAuthorities) &&
    serverConfig.ssl.certificateAuthorities.length > 0
  ) {
    config.ssl.ca = serverConfig.ssl.certificateAuthorities.map(readFile);
  }

  // Add client certificate and key if required by elasticsearch
  if (!ignoreCertAndKey && serverConfig.ssl.certificate && serverConfig.ssl.key) {
    config.ssl.cert = readFile(serverConfig.ssl.certificate);
    config.ssl.key = readFile(serverConfig.ssl.key);
    config.ssl.passphrase = serverConfig.ssl.keyPassphrase;
  }

  return config;
}

export class ClusterClient {
  constructor(private readonly config: ExtendedConfigOptions, private readonly log: Logger) {}

  public callAsInternalUser() {
    // noop
  }

  public close() {
    // noop
  }
}
