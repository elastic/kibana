/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ConfigOptions } from 'elasticsearch';
import { cloneDeep } from 'lodash';
import { Duration } from 'moment';
import { checkServerIdentity } from 'tls';
import url from 'url';
import { pick } from '@kbn/std';
import { Logger } from '../../logging';
import { ElasticsearchConfig } from '../elasticsearch_config';
import { DEFAULT_HEADERS } from '../default_headers';

/**
 * @privateRemarks Config that consumers can pass to the Elasticsearch JS client is complex and includes
 * not only entries from standard `elasticsearch.*` yaml config, but also some Elasticsearch JS
 * client specific options like `keepAlive` or `plugins` (that eventually will be deprecated).
 *
 * @deprecated
 * @public
 */
export type LegacyElasticsearchClientConfig = Pick<ConfigOptions, 'keepAlive' | 'log' | 'plugins'> &
  Pick<
    ElasticsearchConfig,
    | 'apiVersion'
    | 'customHeaders'
    | 'requestHeadersWhitelist'
    | 'sniffOnStart'
    | 'sniffOnConnectionFault'
    | 'hosts'
    | 'username'
    | 'password'
    | 'serviceAccountToken'
  > & {
    pingTimeout?: ElasticsearchConfig['pingTimeout'] | ConfigOptions['pingTimeout'];
    requestTimeout?: ElasticsearchConfig['requestTimeout'] | ConfigOptions['requestTimeout'];
    sniffInterval?: ElasticsearchConfig['sniffInterval'] | ConfigOptions['sniffInterval'];
    ssl?: Partial<ElasticsearchConfig['ssl']>;
  };

/** @internal */
interface LegacyElasticsearchClientConfigOverrides {
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
    serviceAccountToken?: string;
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
  config: LegacyElasticsearchClientConfig,
  log: Logger,
  type: string,
  { ignoreCertAndKey = false, auth = true }: LegacyElasticsearchClientConfigOverrides = {}
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
    esClientConfig.log = getLoggerClass(log, type);
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

  const needsAuth =
    auth !== false && ((config.username && config.password) || config.serviceAccountToken);
  if (needsAuth) {
    if (config.username) {
      esClientConfig.httpAuth = `${config.username}:${config.password}`;
    } else if (config.serviceAccountToken) {
      esClientConfig.serviceAccountToken = config.serviceAccountToken;
    }
  }

  if (Array.isArray(config.hosts)) {
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
        headers: {
          ...DEFAULT_HEADERS,
          ...config.customHeaders,
        },
      };

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

  esClientConfig.ssl.ca = config.ssl.certificateAuthorities;

  // Add client certificate and key if required by elasticsearch
  if (!ignoreCertAndKey && config.ssl.certificate && config.ssl.key) {
    esClientConfig.ssl.cert = config.ssl.certificate;
    esClientConfig.ssl.key = config.ssl.key;
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

function getLoggerClass(log: Logger, type: string) {
  const queryLogger = log.get('query', type);

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
      queryLogger.debug(`${statusCode}\n${method} ${options.path}\n${query ? query.trim() : ''}`);
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
