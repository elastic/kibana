/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { MOCK_IDP_REALM_NAME } from '@kbn/mock-idp-utils';
import type { ScoutServerConfig } from '../../../../../types';
import { defaultConfig } from '../../default/stateful/base.config';

/**
 * Custom Scout server config that enables anonymous authentication.
 * The anonymous user has no `profile_uid`, which is needed to verify
 * that features gated behind `profile_uid` (e.g. dashboard access control)
 * behave correctly when it is absent.
 */
export const servers: ScoutServerConfig = {
  ...defaultConfig,
  esTestCluster: {
    ...defaultConfig.esTestCluster,
    serverArgs: [
      ...defaultConfig.esTestCluster.serverArgs,
      'xpack.security.authc.anonymous.username=anonymous_user',
      'xpack.security.authc.anonymous.roles=editor',
    ],
  },
  kbnTestServer: {
    ...defaultConfig.kbnTestServer,
    serverArgs: [
      ...defaultConfig.kbnTestServer.serverArgs.filter(
        (arg) => !arg.startsWith('--xpack.security.authc.providers')
      ),
      `--xpack.security.authc.providers=${JSON.stringify({
        anonymous: {
          anonymous1: { order: 0, credentials: 'elasticsearch_anonymous_user' },
        },
        saml: { 'cloud-saml-kibana': { order: 1, realm: MOCK_IDP_REALM_NAME } },
        basic: { 'cloud-basic': { order: 2 } },
      })}`,
    ],
  },
};
