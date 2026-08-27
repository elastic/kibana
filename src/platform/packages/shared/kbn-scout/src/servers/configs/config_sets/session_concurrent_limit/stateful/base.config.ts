/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { resolve } from 'path';

import { REPO_ROOT } from '@kbn/repo-info';
import type { ScoutServerConfig } from '../../../../../types';
import { defaultConfig } from '../../default/stateful/base.config';

const addOrReplaceArg = (serverArgs: string[], argName: string, newValue: string) => {
  const argPrefix = `--${argName}=`;
  const idx = serverArgs.findIndex((a) => a.startsWith(argPrefix));
  if (idx === -1) {
    serverArgs.push(`${argPrefix}${newValue}`);
  } else {
    serverArgs[idx] = `${argPrefix}${newValue}`;
  }
};

const SAML1_IDP_METADATA_PATH = resolve(
  REPO_ROOT,
  'x-pack/platform/test/security_api_integration/packages/helpers/saml/idp_metadata.xml'
);

const TEST_ENDPOINTS_PLUGIN_PATH = resolve(
  REPO_ROOT,
  'x-pack/platform/test/security_functional/plugins/test_endpoints'
);

const { hostname: kibanaHostname, port: kibanaPort } = defaultConfig.servers.kibana;

const kbnServerArgs = [...defaultConfig.kbnTestServer.serverArgs];

addOrReplaceArg(kbnServerArgs, 'xpack.security.session.concurrentSessions.maxSessions', '2');
addOrReplaceArg(kbnServerArgs, 'xpack.security.session.cleanupInterval', '5h');
addOrReplaceArg(
  kbnServerArgs,
  'xpack.security.authc.providers',
  JSON.stringify({
    basic: { basic1: { order: 0 } },
    saml: {
      saml1: { order: 1, realm: 'saml1' },
      // Required for Scout's preCreateSecurityIndexesViaSamlAuth step
      'cloud-saml-kibana': { order: 4, realm: 'cloud-saml-kibana' },
    },
    anonymous: {
      anonymous1: {
        order: 3,
        credentials: { username: 'anonymous_user', password: 'changeme' },
      },
    },
  })
);
addOrReplaceArg(
  kbnServerArgs,
  'xpack.task_manager.unsafe.exclude_task_types',
  JSON.stringify(['UPTIME:*'])
);
kbnServerArgs.push(`--plugin-path=${TEST_ENDPOINTS_PLUGIN_PATH}`);

export const sessionConcurrentLimitConfig: ScoutServerConfig = {
  ...defaultConfig,
  esTestCluster: {
    ...defaultConfig.esTestCluster,
    serverArgs: [
      ...defaultConfig.esTestCluster.serverArgs,
      'xpack.security.authc.realms.saml.saml1.order=2',
      `xpack.security.authc.realms.saml.saml1.idp.metadata.path=${SAML1_IDP_METADATA_PATH}`,
      'xpack.security.authc.realms.saml.saml1.idp.entity_id=http://www.elastic.co/saml1',
      `xpack.security.authc.realms.saml.saml1.sp.entity_id=http://${kibanaHostname}:${kibanaPort}`,
      `xpack.security.authc.realms.saml.saml1.sp.logout=http://${kibanaHostname}:${kibanaPort}/logout`,
      `xpack.security.authc.realms.saml.saml1.sp.acs=http://${kibanaHostname}:${kibanaPort}/api/security/saml/callback`,
      'xpack.security.authc.realms.saml.saml1.attributes.principal=urn:oid:0.0.7',
    ],
  },
  kbnTestServer: {
    ...defaultConfig.kbnTestServer,
    serverArgs: kbnServerArgs,
  },
};
