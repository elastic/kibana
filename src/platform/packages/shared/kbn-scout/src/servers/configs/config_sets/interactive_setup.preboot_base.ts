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

/**
 * Shared base for the `interactive_setup_*` server config sets.
 *
 * These config sets are unusual: they boot Kibana into the `preboot` stage on purpose and leave it
 * there, so the interactive-setup (first-boot) UI and APIs are reachable. That requires three things
 * that can only be arranged at boot time, which is why a custom server config set is unavoidable
 * here (nothing below is settable at runtime):
 *
 * 1. **No Elasticsearch connection.** `InteractiveSetupPlugin#setup` only activates setup mode when
 *    `core.elasticsearch.config.credentialsSpecified` is `false` *and* the configured host list is
 *    exactly the default `http://localhost:9200`. So every `--elasticsearch.*` arg is stripped.
 *    Scout's Elasticsearch listens on 9220, which keeps the default host unreachable and therefore
 *    keeps setup mode active — but note that an *unrelated* Elasticsearch listening on 9200 makes
 *    the connection check succeed, and Kibana then boots straight past the wizard. If these suites
 *    fail locally with a booted Kibana, check what is on port 9200 first.
 * 2. **A writable Kibana config file.** On success, interactive setup writes the resolved
 *    Elasticsearch connection into `initializerContext.env.configs[0]`, so `--config` must point at
 *    a writable, initially empty YAML file.
 * 3. **The preboot test-endpoints plugin**, which exposes the generated verification code to tests.
 *
 * They also set `prebootOnly`, which tells Scout to skip the post-startup steps that assume a fully
 * booted Kibana (pre-creating the Elasticsearch Security indexes over SAML).
 *
 * ## Why there is one config set per Playwright config
 *
 * Each of these suites ends the `preboot` stage: the happy-path test writes the Elasticsearch
 * connection to disk and Kibana boots, permanently. So every such Playwright config needs a Kibana
 * that was *just* started into `preboot`.
 *
 * CI starts one test server per lane and runs every config assigned to that lane against it
 * (`.buildkite/scripts/steps/test/scout/run_test_lane.sh`), and lanes are packed per config set
 * (`create_test_tracks.ts`). Two configs sharing a config set can therefore land in the same lane,
 * where the second one runs against the Kibana the first already booted — requests to the preboot
 * routes then get redirected to the login page (HTTP 302) instead of served.
 *
 * Since nothing lets a config demand its own lane, a dedicated config set per Playwright config is
 * the only way to guarantee a lane never holds two of them. That is why the sets below are thin
 * aliases over three shared server definitions rather than three shared config sets.
 */

const TEST_ENDPOINTS_PLUGIN_PATH = resolve(
  REPO_ROOT,
  'src/platform/plugins/private/interactive_setup/test/plugins/test_endpoints'
);

/** PKCS12 keystore mimicking the one Elasticsearch auto-generates for a node's HTTP layer. */
export const ES_HTTP_KEYSTORE_PATH = resolve(
  REPO_ROOT,
  'src/platform/plugins/private/interactive_setup/test/helpers/certs/elasticsearch.p12'
);
export const ES_HTTP_KEYSTORE_PASSWORD = 'storepass';

const TEMP_CONFIG_PREFIX = 'interactive_setup_kibana_';

/**
 * Creates the empty, writable `kibana.yml` that interactive setup writes the Elasticsearch
 * connection into, and sweeps up files left behind by previous runs (each run needs a *fresh*
 * empty file, so they cannot be reused).
 */
const createEmptyKibanaConfigFile = (): string => {
  const dataPath = getDataPath();
  fs.mkdirSync(dataPath, { recursive: true });

  for (const entry of fs.readdirSync(dataPath)) {
    if (entry.startsWith(TEMP_CONFIG_PREFIX) && entry.endsWith('.yml')) {
      try {
        fs.unlinkSync(join(dataPath, entry));
      } catch {
        // A leftover file we cannot remove is harmless: only the path we return below is used.
      }
    }
  }

  const configFilePath = join(dataPath, `${TEMP_CONFIG_PREFIX}${Date.now()}.yml`);
  fs.writeFileSync(configFilePath, '');

  return configFilePath;
};

const isElasticsearchConnectionArg = (arg: string) => arg.startsWith('--elasticsearch.');
const isConfigArg = (arg: string) => arg.startsWith('--config');

/**
 * Kibana args that depend on the mock-IdP SAML realm existing in Elasticsearch. They have to go
 * when Elasticsearch runs with security disabled, otherwise Kibana is left pointing at a realm
 * that cannot exist. Dropping them falls back to Kibana's default basic-auth provider.
 */
const isKibanaSamlSecurityArg = (arg: string) =>
  arg.startsWith('--xpack.security.authc.providers=') ||
  arg.startsWith('--xpack.security.authc.selector.enabled=') ||
  arg === `--plugin-path=${SAML_IDP_PLUGIN_PATH}`;

export interface PrebootConfigOptions {
  /** Elasticsearch server args. Replaces Scout's stateful defaults outright. */
  esServerArgs: string[];
  /** Serve the Elasticsearch HTTP layer over TLS. */
  esSsl?: boolean;
  /** Elasticsearch protocol tests should use to reach the cluster. */
  esProtocol?: 'http' | 'https';
  /** CA certificates tests need to trust the Elasticsearch HTTP layer. */
  esCertificateAuthorities?: Array<string | Buffer>;
  /** Files copied into the Elasticsearch config directory. Defaults to Scout's stateful roles.yml. */
  esFiles?: string[];
  /**
   * Drop Kibana's SAML wiring and fall back to basic auth. Required when Elasticsearch runs with
   * `xpack.security.enabled=false` — see {@link isKibanaSamlSecurityArg}.
   */
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
        // Kibana never reports the `available` status here — it stays in `preboot` waiting to be
        // configured, and this is the line it logs once the interactive-setup UI is reachable.
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
