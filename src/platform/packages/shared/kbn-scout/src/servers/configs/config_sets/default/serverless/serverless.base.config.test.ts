/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KbnServerlessProjectType } from '@kbn/dev-utils';
import { KBN_CERT_PATH, KBN_KEY_PATH, KBN_SERVERLESS_UIAM_CERTS } from '@kbn/dev-utils';
import type { ScoutServerConfig } from '../../../../../types';
import { defaultConfig } from './serverless.base.config';
import { servers as observabilityComplete } from './observability_complete.serverless.config';
import { servers as observabilityLogsEssentials } from './observability_logs_essentials.serverless.config';
import { servers as search } from './search.serverless.config';
import { servers as securityComplete } from './security_complete.serverless.config';
import { servers as securityEase } from './security_ease.serverless.config';
import { servers as securityEssentials } from './security_essentials.serverless.config';
import { servers as vectordb } from './vectordb.serverless.config';

const uiamSslArgs = (serverArgs: string[]) =>
  serverArgs.filter(
    (arg) =>
      arg.startsWith('--xpack.security.uiam.ssl.certificate=') ||
      arg.startsWith('--xpack.security.uiam.ssl.key=')
  );

const projectConfigs: Array<[string, ScoutServerConfig, KbnServerlessProjectType]> = [
  ['search', search, 'search'],
  ['observability complete', observabilityComplete, 'observability'],
  ['observability logs essentials', observabilityLogsEssentials, 'observability'],
  ['security complete', securityComplete, 'security'],
  ['security essentials', securityEssentials, 'security'],
  ['security ease', securityEase, 'security'],
  ['vectordb', vectordb, 'vectordb'],
];

describe('Serverless UIAM client certificate', () => {
  it('presents the search certificate in the base config', () => {
    expect(uiamSslArgs(defaultConfig.kbnTestServer.serverArgs)).toEqual([
      `--xpack.security.uiam.ssl.certificate=${KBN_CERT_PATH}`,
      `--xpack.security.uiam.ssl.key=${KBN_KEY_PATH}`,
    ]);
  });

  it.each(projectConfigs)(
    'presents only the project certificate for %s',
    (_, servers, projectType) => {
      expect(uiamSslArgs(servers.kbnTestServer.serverArgs)).toEqual([
        `--xpack.security.uiam.ssl.certificate=${KBN_SERVERLESS_UIAM_CERTS[projectType].certPath}`,
        `--xpack.security.uiam.ssl.key=${KBN_SERVERLESS_UIAM_CERTS[projectType].keyPath}`,
      ]);
    }
  );
});
