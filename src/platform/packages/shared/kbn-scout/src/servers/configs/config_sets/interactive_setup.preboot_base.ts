/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs, { readFileSync } from 'fs';
import { join, resolve } from 'path';

import { CA_CERT_PATH } from '@kbn/dev-utils';
import { REPO_ROOT } from '@kbn/repo-info';
import { getDataPath } from '@kbn/utils';

import type { ScoutServerConfig } from '../../../types';
import { SAML_IDP_PLUGIN_PATH } from '../constants';
import { defaultConfig } from './default/stateful/base.config';

const TEST_ENDPOINTS_PLUGIN_PATH = resolve(
  REPO_ROOT,
  'src/platform/plugins/private/interactive_setup/test/plugins/test_endpoints'
);

export const ES_HTTP_KEYSTORE_PATH = resolve(
  REPO_ROOT,
  'src/platform/plugins/private/interactive_setup/test/helpers/certs/elasticsearch.p12'
);
export const ES_HTTP_KEYSTORE_PASSWORD = 'storepass';

const TEMP_CONFIG_PREFIX = 'interactive_setup_kibana_';

const createEmptyKibanaConfigFile = (): string => {
  const dataPath = getDataPath();
  fs.mkdirSync(dataPath, { recursive: true });

  for (const entry of fs.readdirSync(dataPath)) {
    if (entry.startsWith(TEMP_CONFIG_PREFIX) && entry.endsWith('.yml')) {
      try {
        fs.unlinkSync(join(dataPath, entry));
      } catch {
        // leftover from a previous run; harmless if it can't be removed
      }
    }
  }

  const configFilePath = join(dataPath, `${TEMP_CONFIG_PREFIX}${Date.now()}.yml`);
  fs.writeFileSync(configFilePath, '');

  return configFilePath;
};

const isElasticsearchConnectionArg = (arg: string) => arg.startsWith('--elasticsearch.');
const isConfigArg = (arg: string) => arg.startsWith('--config');

// Must be dropped when ES runs with security disabled — the mock-IdP realm won't exist.
const isKibanaSamlSecurityArg = (arg: string) =>
  arg.startsWith('--xpack.security.authc.providers=') ||
  arg.startsWith('--xpack.security.authc.selector.enabled=') ||
  arg === `--plugin-path=${SAML_IDP_PLUGIN_PATH}`;

export interface PrebootConfigOptions {
  esServerArgs: string[];
  esSsl?: boolean;
  esProtocol?: 'http' | 'https';
  esCertificateAuthorities?: Array<string | Buffer>;
  esFiles?: string[];
  withoutKibanaSecurity?: boolean;
}

export const createPrebootConfig = ({
  esServerArgs,
  esSsl = false,
  esProtocol = 'http',
  esCertificateAuthorities,
  esFiles = defaultConfig.esTestCluster.files,
  withoutKibanaSecurity = false,
}: PrebootConfigOptions): ScoutServerConfig => {
  const kibanaConfigFilePath = createEmptyKibanaConfigFile();

  const serverArgs = [
    ...defaultConfig.kbnTestServer.serverArgs.filter(
      (arg) =>
        !isElasticsearchConnectionArg(arg) &&
        !isConfigArg(arg) &&
        !(withoutKibanaSecurity && isKibanaSamlSecurityArg(arg))
    ),
    `--plugin-path=${TEST_ENDPOINTS_PLUGIN_PATH}`,
    `--config=${kibanaConfigFilePath}`,
  ];

  return {
    prebootOnly: true,
    servers: {
      ...defaultConfig.servers,
      elasticsearch: {
        ...defaultConfig.servers.elasticsearch,
        protocol: esProtocol,
        ...(esCertificateAuthorities ? { certificateAuthorities: esCertificateAuthorities } : {}),
      },
    },
    dockerServers: defaultConfig.dockerServers,
    esTestCluster: {
      ...defaultConfig.esTestCluster,
      files: esFiles,
      serverArgs: esServerArgs,
      ssl: esSsl,
    },
    kbnTestServer: {
      ...defaultConfig.kbnTestServer,
      serverArgs,
      runOptions: {
        wait: /Kibana has not been configured/,
      },
    },
  };
};

export const createTlsServers = (): ScoutServerConfig =>
  createPrebootConfig({
    esProtocol: 'https',
    esSsl: true,
    esCertificateAuthorities: [readFileSync(CA_CERT_PATH)],
    esServerArgs: [
      ...defaultConfig.esTestCluster.serverArgs,
      'xpack.security.enabled=true',
      'xpack.security.enrollment.enabled=true',
      `xpack.security.http.ssl.keystore.path=${ES_HTTP_KEYSTORE_PATH}`,
      `xpack.security.http.ssl.keystore.secure_password=${ES_HTTP_KEYSTORE_PASSWORD}`,
    ],
  });

export const createNoTlsServers = (): ScoutServerConfig =>
  createPrebootConfig({
    esServerArgs: [...defaultConfig.esTestCluster.serverArgs, 'xpack.security.enabled=true'],
  });

export const createNoSecurityServers = (): ScoutServerConfig =>
  createPrebootConfig({
    esFiles: [],
    withoutKibanaSecurity: true,
    esServerArgs: [
      ...defaultConfig.esTestCluster.serverArgs.filter((arg) => !arg.startsWith('xpack.security.')),
      'xpack.security.enabled=false',
    ],
  });
