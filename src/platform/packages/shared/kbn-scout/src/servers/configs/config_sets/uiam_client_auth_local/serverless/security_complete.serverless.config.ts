/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { servers as uiamConfig } from '../../uiam_local/serverless/security_complete.serverless.config';
import type { ScoutServerConfig } from '../../../../../types';

export const servers: ScoutServerConfig = {
  ...uiamConfig,
  // This suite authenticates with inbound bearer tokens and intentionally cannot use SAML sessions.
  preCreateSecurityIndexes: false,
  esServerlessOptions: {
    ...uiamConfig.esServerlessOptions,
    uiam: true,
    uiamOAuth: true,
  },
  kbnTestServer: {
    ...uiamConfig.kbnTestServer,
    serverArgs: [
      ...uiamConfig.kbnTestServer.serverArgs.filter(
        (arg) => !arg.startsWith('--xpack.security.uiam.sharedSecret=')
      ),
      // Upstream requests carry UIAM's valid secret; substituting Kibana's must fail authentication.
      '--xpack.security.uiam.sharedSecret=scout-kibana-secret-not-accepted-by-uiam',
    ],
  },
};
