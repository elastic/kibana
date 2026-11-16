/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { readdirSync } from 'fs';
import { resolve } from 'path';
import type { KbnServerlessProjectType } from '@kbn/dev-utils';
import { KBN_CERT_PATH, KBN_KEY_PATH, KBN_SERVERLESS_UIAM_CERTS } from '@kbn/dev-utils';
import type { ServerlessProjectType } from '@kbn/es';
import { isServerlessProjectType } from '@kbn/es';
import type { ScoutServerConfig } from '../../../../../types';
import { defaultConfig } from './serverless.base.config';

/** Maps the `--serverless=` project type onto the one the UIAM certificates are named for. */
const UIAM_PROJECT_TYPES: Readonly<Record<ServerlessProjectType, KbnServerlessProjectType>> = {
  es: 'search',
  oblt: 'observability',
  security: 'security',
  vectordb: 'vectordb',
};

const uiamSslArgs = (serverArgs: string[]) =>
  serverArgs.filter(
    (arg) =>
      arg.startsWith('--xpack.security.uiam.ssl.certificate=') ||
      arg.startsWith('--xpack.security.uiam.ssl.key=')
  );

const projectTypeOf = (serverArgs: string[]): ServerlessProjectType => {
  const arg = serverArgs.find((serverArg) => serverArg.startsWith('--serverless='));
  if (!arg) {
    throw new Error(`Config has no --serverless= argument: ${serverArgs.join(' ')}`);
  }

  const projectType = arg.replace('--serverless=', '');
  if (!isServerlessProjectType(projectType)) {
    throw new Error(`Config has an unknown --serverless= project type: ${projectType}`);
  }

  return projectType;
};

// Read from disk rather than listed here, so a config added later is checked without having to
// remember this test. UIAM reads Kibana's project type from the certificate, and a config that
// does not pick one inherits the search certificate of the base config.
const configFiles = readdirSync(__dirname).filter((file) => file.endsWith('.serverless.config.ts'));

describe('Serverless UIAM client certificate', () => {
  it('presents the search certificate in the base config', () => {
    expect(uiamSslArgs(defaultConfig.kbnTestServer.serverArgs)).toEqual([
      `--xpack.security.uiam.ssl.certificate=${KBN_CERT_PATH}`,
      `--xpack.security.uiam.ssl.key=${KBN_KEY_PATH}`,
    ]);
  });

  it('finds the serverless project configs', () => {
    expect(configFiles.length).toBeGreaterThan(0);
  });

  it.each(configFiles)('presents the certificate of its own project type in %s', async (file) => {
    const { servers } = (await import(resolve(__dirname, file))) as {
      servers: ScoutServerConfig;
    };
    const { serverArgs } = servers.kbnTestServer;
    const projectType = UIAM_PROJECT_TYPES[projectTypeOf(serverArgs)];

    expect(uiamSslArgs(serverArgs)).toEqual([
      `--xpack.security.uiam.ssl.certificate=${KBN_SERVERLESS_UIAM_CERTS[projectType].certPath}`,
      `--xpack.security.uiam.ssl.key=${KBN_SERVERLESS_UIAM_CERTS[projectType].keyPath}`,
    ]);
  });
});
