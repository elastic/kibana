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

import { ConfigOptions } from 'elasticsearch';
import { readFileSync } from 'fs';
import { cloneDeep } from 'lodash';
import { Duration } from 'moment';
import { checkServerIdentity } from 'tls';
import url from 'url';
import { pick } from '../../utils';
import { Logger } from '../logging';
import { ElasticsearchConfig } from './elasticsearch_config';

/**
 * @internalremarks Config that consumers can pass to the Elasticsearch JS client is complex and includes
 * not only entries from standard `elasticsearch.*` yaml config, but also some Elasticsearch JS
 * client specific options like `keepAlive` or `plugins` (that eventually will be deprecated).
 *
 * @public
 */
export type ElasticsearchClientConfig = Pick<ConfigOptions, 'keepAlive' | 'log' | 'plugins'> &
  Pick<
    ElasticsearchConfig,
    | 'apiVersion'
    | 'customHeaders'
    | 'logQueries'
    | 'requestHeadersWhitelist'
    | 'sniffOnStart'
    | 'sniffOnConnectionFault'
    | 'hosts'
    | 'username'
    | 'password'
  > & {
    pingTimeout?: ElasticsearchConfig['pingTimeout'] | ConfigOptions['pingTimeout'];
    requestTimeout?: ElasticsearchConfig['requestTimeout'] | ConfigOptions['requestTimeout'];
    sniffInterval?: ElasticsearchConfig['sniffInterval'] | ConfigOptions['sniffInterval'];
    ssl?: Partial<ElasticsearchConfig['ssl']>;
  };

/** @internal */
interface ElasticsearchClientConfigOverrides {
  /**
   * If set to `true`, username and password from the config won't be used
   * to access Elasticsearch API even if these are specified.
   */
  auth?: boolean;

  /**
   * If set to `true`, `ssl.key` and `ssl.certificate` provided through config won't
   * be used to connect to Elasticsearch.
   */
  ignoreCertAndKey?: boolean;
}

// Original `ConfigOptions` defines `ssl: object` so we need something more specific.
/** @internal */
type ExtendedConfigOptions = ConfigOptions &
  Partial<{
    ssl: Partial<{
      rejectUnauthorized: boolean;
      checkServerIdentity: typeof checkServerIdentity;
      ca: string[];
      cert: string;
      key: string;
      passphrase: string;
    }>;
  }>;

/** @internal */
export function parseElasticsearchClientConfig(
  config: ElasticsearchClientConfig,
  log: Logger,
  { ignoreCertAndKey = false, auth = true }: ElasticsearchClientConfigOverrides = {}
) {
  const esClientConfig: ExtendedConfigOptions = {
    keepAlive: true,
    ...pick(config, [
      'apiVersion',
      'sniffOnStart',
      'sniffOnConnectionFault',
      'keepAlive',
      'log',
      'plugins',
    ]),
  };

  if (esClientConfig.log == null) {
    esClientConfig.log = getLoggerClass(log, config.logQueries);
  }

  if (config.pingTimeout != null) {
    esClientConfig.pingTimeout = getDurationAsMs(config.pingTimeout);
  }

  if (config.requestTimeout != null) {
    esClientConfig.requestTimeout = getDurationAsMs(config.requestTimeout);
  }

  if (config.sniffInterval) {
    esClientConfig.sniffInterval = getDurationAsMs(config.sniffInterval);
  }

  if (Array.isArray(config.hosts)) {
    const needsAuth = auth !== false && config.username && config.password;
    esClientConfig.hosts = config.hosts.map((nodeUrl: string) => {
      const uri = url.parse(nodeUrl);

      const httpsURI = uri.protocol === 'https:';
      const httpURI = uri.protocol === 'http:';

      const host: Record<string, unknown> = {
        host: uri.hostname,
        port: uri.port || (httpsURI && '443') || (httpURI && '80'),
        protocol: uri.protocol,
        path: uri.pathname,
        query: uri.query,
        headers: config.customHeaders,
      };

      if (needsAuth) {
        host.auth = `${config.username}:${config.password}`;
      }

      return host;
    });
  }

  if (config.ssl === undefined) {
    return cloneDeep(esClientConfig);
  }

  esClientConfig.ssl = {};

  const verificationMode = config.ssl.verificationMode;
  switch (verificationMode) {
    case 'none':
      esClientConfig.ssl.rejectUnauthorized = false;
      break;
    case 'certificate':
      esClientConfig.ssl.rejectUnauthorized = true;

      // by default, NodeJS is checking the server identify
      esClientConfig.ssl.checkServerIdentity = () => undefined;
      break;
    case 'full':
      esClientConfig.ssl.rejectUnauthorized = true;
      break;
    default:
      throw new Error(`Unknown ssl verificationMode: ${verificationMode}`);
  }

  const readFile = (file: string) => readFileSync(file, 'utf8');
  if (
    config.ssl.certificateAuthorities !== undefined &&
    config.ssl.certificateAuthorities.length > 0
  ) {
    esClientConfig.ssl.ca = config.ssl.certificateAuthorities.map(readFile);
  }

  // Add client certificate and key if required by elasticsearch
  if (!ignoreCertAndKey && config.ssl.certificate && config.ssl.key) {
    esClientConfig.ssl.cert = readFile(config.ssl.certificate);
    esClientConfig.ssl.key = readFile(config.ssl.key);
    esClientConfig.ssl.passphrase = config.ssl.keyPassphrase;
  }

  // Elasticsearch JS client mutates config object, so all properties that are
  // usually passed by reference should be cloned to avoid any side effects.
  return cloneDeep(esClientConfig);
}

function getDurationAsMs(duration: number | Duration) {
  if (typeof duration === 'number') {
    return duration;
  }

  return duration.asMilliseconds();
}

function getLoggerClass(log: Logger, logQueries = false) {
  return class ElasticsearchClientLogging {
    public error(err: string | Error) {
      log.error(err);
    }

    public warning(message: string) {
      log.warn(message);
    }

    public trace(
      method: string,
      options: { path: string },
      query: string,
      _: unknown,
      statusCode: string
    ) {
      if (logQueries) {
        log.debug(`${statusCode}\n${method} ${options.path}\n${query ? query.trim() : ''}`, {
          tags: ['query'],
        });
      }
    }

    // elasticsearch-js expects the following functions to exist
    public info() {
      // noop
    }

    public debug() {
      // noop
    }

    public close() {
      // noop
    }
  };
}
