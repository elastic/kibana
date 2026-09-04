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

addOrReplaceArg(
  kbnServerArgs,
  'xpack.security.authc.providers',
  JSON.stringify({
    basic: { basic1: { order: 0 } },
    saml: {
      saml1: { order: 1, realm: 'saml1' },
      // Required for Scout's preCreateSecurityIndexesViaSamlAuth step
      'cloud-saml-kibana': { order: 2, realm: 'cloud-saml-kibana' },
    },
  })
);

export const sessionInvalidateConfig: ScoutServerConfig = {
  ...defaultConfig,
  esTestCluster: withSaml1Realm(defaultConfig, { order: 2 }),
  kbnTestServer: {
    ...defaultConfig.kbnTestServer,
    serverArgs: kbnServerArgs,
  },
};
