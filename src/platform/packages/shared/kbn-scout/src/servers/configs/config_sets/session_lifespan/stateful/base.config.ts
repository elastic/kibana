/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutServerConfig } from '../../../../../types';
import { defaultConfig } from '../../default/stateful/base.config';
import { addOrReplaceArg, withSaml1Realm } from '../../session_management/shared';

const kbnServerArgs = [...defaultConfig.kbnTestServer.serverArgs];

addOrReplaceArg(kbnServerArgs, 'xpack.security.session.lifespan', '10s');
addOrReplaceArg(kbnServerArgs, 'xpack.security.session.cleanupInterval', '20s');
addOrReplaceArg(
  kbnServerArgs,
  'xpack.security.authc.providers',
  JSON.stringify({
    basic: { basic1: { order: 0 } },
    saml: {
      saml_fallback: { order: 1, realm: 'saml1' },
      saml_override: { order: 2, realm: 'saml1', session: { lifespan: '2m' } },
      saml_disable: { order: 3, realm: 'saml1', session: { lifespan: 0 } },
      // Required for Scout's preCreateSecurityIndexesViaSamlAuth step
      'cloud-saml-kibana': { order: 4, realm: 'cloud-saml-kibana' },
    },
  })
);
addOrReplaceArg(
  kbnServerArgs,
  'xpack.task_manager.unsafe.exclude_task_types',
  JSON.stringify(['Fleet-Metrics-Task', 'UPTIME:*'])
);

export const sessionLifespanConfig: ScoutServerConfig = {
  ...defaultConfig,
  esTestCluster: withSaml1Realm(defaultConfig, {
    order: 1,
    extraEsArgs: ['xpack.security.authc.token.timeout=15s'],
  }),
  kbnTestServer: {
    ...defaultConfig.kbnTestServer,
    serverArgs: kbnServerArgs,
  },
};
