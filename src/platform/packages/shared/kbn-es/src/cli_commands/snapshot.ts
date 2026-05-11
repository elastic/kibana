/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import dedent from 'dedent';
import getopts from 'getopts';
import { resolve } from 'path';
import { writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { ToolingLog } from '@kbn/tooling-log';
import { getTimeReporter } from '@kbn/ci-stats-reporter';
import {
  MOCK_IDP_KIBANA_BASE_PATH,
  MOCK_IDP_REALM_NAME,
  MOCK_IDP_ENTITY_ID,
  MOCK_IDP_ATTRIBUTE_PRINCIPAL,
  MOCK_IDP_ATTRIBUTE_ROLES,
  MOCK_IDP_ATTRIBUTE_NAME,
  MOCK_IDP_ATTRIBUTE_EMAIL,
  createMockIdpMetadata,
} from '@kbn/mock-idp-utils';

import { Cluster } from '../cluster';
import { STATEFUL_ROLES_ROOT_PATH } from '../paths';
import { parseTimeoutToMs } from '../utils';
import { createCliError } from '../errors';
import type { Command } from './types';

// Matches the fixed base path applied to stateful Kibana when running with the SAML Mock IdP.
const DEFAULT_KIBANA_URL = `http://localhost:5601${MOCK_IDP_KIBANA_BASE_PATH}`;

export const snapshot: Command = {
  description: 'Downloads and run from a nightly snapshot',
  help: (defaults = {}) => {
    const { license = 'trial', password = 'changeme', 'base-path': basePath } = defaults;

    return dedent`
    Options:

      --license         Run with a 'basic' or 'trial' license [default: ${license}]
      --version         Version of ES to download [default: ${defaults.version}]
      --base-path       Path containing cache/installations [default: ${basePath}]
      --install-path    Installation path, defaults to 'source' within base-path
      --data-archive    Path to zip or tarball containing an ES data directory to seed the cluster with.
      --password        Sets password for elastic user [default: ${password}]
      --password.[user] Sets password for native realm user [default: ${password}]
      -E                Additional key=value settings to pass to Elasticsearch
      --download-only   Download the snapshot but don't actually start it
      --port            The port to bind to on 127.0.0.1 [default: 9200]
      --kill            Kill running ES Docker containers before starting
      --ssl             Sets up SSL on Elasticsearch
      --kibana-url      Fully qualified URL where Kibana is hosted (including base path). Used to configure
                        the SAML Mock IdP realm so SP/ACS endpoints match Kibana. [default: ${DEFAULT_KIBANA_URL}]
      --use-cached      Skips cache verification and use cached ES snapshot.
      --skip-ready-check  Disable the ready check,
      --ready-timeout   Customize the ready check timeout, in seconds or "Xm" format, defaults to 1m
      --es-log-level    Log level for ES stdout output (all, info, warn, error, silent) [default: info]
      --plugins         Comma seperated list of Elasticsearch plugins to install
      --secure-files     Comma seperated list of secure_setting_name=/path pairs

    Example:

      es snapshot --version 5.6.8 -E cluster.name=test -E path.data=/tmp/es-data
  `;
  },
  run: async (defaults = {}) => {
    const runStartTime = Date.now();
    const log = new ToolingLog({
      level: 'info',
      writeTo: process.stdout,
    });
    const reportTime = getTimeReporter(log, 'scripts/es snapshot');

    const argv = process.argv.slice(2);
    const options = getopts(argv, {
      alias: {
        basePath: 'base-path',
        installPath: 'install-path',
        dataArchive: 'data-archive',
        esArgs: 'E',
        useCached: 'use-cached',
        skipReadyCheck: 'skip-ready-check',
        readyTimeout: 'ready-timeout',
        esLogLevel: 'es-log-level',
        secureFiles: 'secure-files',
        kibanaUrl: 'kibana-url',
      },

      string: ['version', 'ready-timeout', 'es-log-level', 'kibana-url'],
      boolean: ['download-only', 'use-cached', 'skip-ready-check', 'kill'],

      default: { kibanaUrl: DEFAULT_KIBANA_URL, ...defaults },
    });

    const cluster = new Cluster({ ssl: options.ssl });

    if (options.docker) {
      throw createCliError(
        `The --docker flag has been removed from 'es snapshot'. Use 'yarn es docker --snapshot' instead.`
      );
    } else if (options['download-only']) {
      await cluster.downloadSnapshot({
        version: options.version,
        license: options.license,
        basePath: options.basePath,
        log,
        useCached: options.useCached,
      });
    } else {
      // Collect user-provided esArgs
      const userEsArgs: string[] = Array.isArray(options.esArgs)
        ? options.esArgs
        : options.esArgs
        ? [options.esArgs]
        : [];

      let samlResources: string[] = [];

      // Auto-configure SAML realm unless user has already provided SAML realm args via -E
      // or is using a basic license (SAML requires trial or higher)
      const hasSamlConfig = userEsArgs.some((arg) =>
        arg.includes(`authc.realms.saml.${MOCK_IDP_REALM_NAME}.`)
      );

      const kibanaUrl: string = options.kibanaUrl || DEFAULT_KIBANA_URL;

      if (!hasSamlConfig && options.license !== 'basic') {
        log.info('Configuring SAML realm for Mock IdP with Kibana at %s', kibanaUrl);

        // Generate IDP metadata with the correct Kibana URL
        const metadata = await createMockIdpMetadata(kibanaUrl);
        const metadataPath = resolve(tmpdir(), 'mock_idp_metadata.xml');
        writeFileSync(metadataPath, metadata);

        const samlEsArgs = [
          'xpack.security.authc.token.enabled=true',
          `xpack.security.authc.realms.saml.${MOCK_IDP_REALM_NAME}.order=0`,
          `xpack.security.authc.realms.saml.${MOCK_IDP_REALM_NAME}.idp.metadata.path=${metadataPath}`,
          `xpack.security.authc.realms.saml.${MOCK_IDP_REALM_NAME}.idp.entity_id=${MOCK_IDP_ENTITY_ID}`,
          `xpack.security.authc.realms.saml.${MOCK_IDP_REALM_NAME}.sp.entity_id=${kibanaUrl}`,
          `xpack.security.authc.realms.saml.${MOCK_IDP_REALM_NAME}.sp.acs=${kibanaUrl}/api/security/saml/callback`,
          `xpack.security.authc.realms.saml.${MOCK_IDP_REALM_NAME}.sp.logout=${kibanaUrl}/logout`,
          `xpack.security.authc.realms.saml.${MOCK_IDP_REALM_NAME}.attributes.principal=${MOCK_IDP_ATTRIBUTE_PRINCIPAL}`,
          `xpack.security.authc.realms.saml.${MOCK_IDP_REALM_NAME}.attributes.groups=${MOCK_IDP_ATTRIBUTE_ROLES}`,
          `xpack.security.authc.realms.saml.${MOCK_IDP_REALM_NAME}.attributes.name=${MOCK_IDP_ATTRIBUTE_NAME}`,
          `xpack.security.authc.realms.saml.${MOCK_IDP_REALM_NAME}.attributes.mail=${MOCK_IDP_ATTRIBUTE_EMAIL}`,
        ];

        // SAML args go first so user -E args can override them
        options.esArgs = [...samlEsArgs, ...userEsArgs];

        // Copy stateful roles.yml so ES knows about viewer, editor, admin, system_indices_superuser
        samlResources = [resolve(STATEFUL_ROLES_ROOT_PATH, 'roles.yml')];
      } else if (options.license === 'basic') {
        log.warning(
          `Skipping SAML Mock IdP realm auto-configuration because --license=basic does not support the SAML realm. ` +
            `Run Kibana with \`--mockIdpPlugin.enabled=false\` (or set it in kibana.dev.yml) so it doesn't try to enable the SAML provider.`
        );
      } else {
        log.warning(
          `Skipping SAML Mock IdP realm auto-configuration because user-provided -E args already configure the "${MOCK_IDP_REALM_NAME}" SAML realm.`
        );
      }

      const installStartTime = Date.now();
      const { installPath } = await cluster.installSnapshot({
        version: options.version,
        license: options.license,
        basePath: options.basePath,
        log,
        useCached: options.useCached,
        password: options.password,
        esArgs: options.esArgs,
        resources: samlResources,
      });

      if (options.dataArchive) {
        await cluster.extractDataDirectory(installPath, options.dataArchive);
      }
      if (options.plugins) {
        await cluster.installPlugins(installPath, options.plugins, options.esJavaOpts);
      }
      if (typeof options.secureFiles === 'string' && options.secureFiles) {
        const pairs = options.secureFiles
          .split(',')
          .map((kv: string) => kv.split('=').map((v: string) => v.trim()));
        await cluster.configureKeystoreWithSecureSettingsFiles(installPath, pairs);
      }

      reportTime(installStartTime, 'installed', {
        success: true,
        ...options,
      });

      await cluster.run(installPath, {
        reportTime,
        startTime: runStartTime,
        ...options,
        esStdoutLogLevel: options.esLogLevel || 'info',
        readyTimeout: parseTimeoutToMs(options.readyTimeout),
      });
    }
  },
};
