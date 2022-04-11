/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ConnectionOptions as TlsConnectionOptions } from 'tls';
import { URL } from 'url';
import { Duration } from 'moment';
import { ClientOptions, NodeOptions } from '@elastic/elasticsearch';
import { ElasticsearchConfig } from '../elasticsearch_config';
import { DEFAULT_HEADERS } from '../default_headers';

/**
 * Configuration options to be used to create a {@link IClusterClient | cluster client} using the
 * {@link ElasticsearchServiceStart.createClient | createClient API}
 *
 * @public
 */
export type ElasticsearchClientConfig = Pick<
  ElasticsearchConfig,
  | 'customHeaders'
  | 'sniffOnStart'
  | 'sniffOnConnectionFault'
  | 'requestHeadersWhitelist'
  | 'sniffInterval'
  | 'hosts'
  | 'username'
  | 'password'
  | 'serviceAccountToken'
> & {
  pingTimeout?: ElasticsearchConfig['pingTimeout'] | ClientOptions['pingTimeout'];
  requestTimeout?: ElasticsearchConfig['requestTimeout'] | ClientOptions['requestTimeout'];
  ssl?: Partial<ElasticsearchConfig['ssl']>;
  keepAlive?: boolean;
  caFingerprint?: ClientOptions['caFingerprint'];
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
    headers: {
      ...DEFAULT_HEADERS,
      ...config.customHeaders,
    },
    // do not make assumption on user-supplied data content
    // fixes https://github.com/elastic/kibana/issues/101944
    disablePrototypePoisoningProtection: true,
    agent: {
      maxSockets: Infinity,
      keepAlive: config.keepAlive ?? true,
    },
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

  if (!scoped) {
    if (config.username && config.password) {
      clientOptions.auth = {
        username: config.username,
        password: config.password,
      };
    } else if (config.serviceAccountToken) {
      clientOptions.auth = {
        bearer: config.serviceAccountToken,
      };
    }
  }

  clientOptions.nodes = config.hosts.map((host) => convertHost(host));

  if (config.ssl) {
    clientOptions.ssl = generateSslConfig(
      config.ssl,
      scoped && !config.ssl.alwaysPresentCertificate
    );
  }

  if (config.caFingerprint != null) {
    clientOptions.caFingerprint = config.caFingerprint;
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

const convertHost = (host: string): NodeOptions => {
  const url = new URL(host);
  const isHTTPS = url.protocol === 'https:';
  url.port = url.port || (isHTTPS ? '443' : '80');

  return {
    url,
  };
};

const getDurationAsMs = (duration: number | Duration) =>
  typeof duration === 'number' ? duration : duration.asMilliseconds();
