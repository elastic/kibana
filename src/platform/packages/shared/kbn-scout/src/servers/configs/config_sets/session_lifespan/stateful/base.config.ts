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

const { hostname: kibanaHostname, port: kibanaPort } = defaultConfig.servers.kibana;

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
  esTestCluster: {
    ...defaultConfig.esTestCluster,
    serverArgs: [
      ...defaultConfig.esTestCluster.serverArgs,
      'xpack.security.authc.token.timeout=15s',
      'xpack.security.authc.realms.saml.saml1.order=1',
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
