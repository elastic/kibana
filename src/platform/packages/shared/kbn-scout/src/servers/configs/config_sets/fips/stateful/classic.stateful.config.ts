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

// FIPS must be enabled before startup. Clear host provider overrides so the
// installed distribution's launcher selects its bundled provider.
export const servers: ScoutServerConfig = {
  ...defaultConfig,
  kbnTestServer: {
    ...defaultConfig.kbnTestServer,
    serverArgs: [
      ...defaultConfig.kbnTestServer.serverArgs,
      '--xpack.security.fipsMode.enabled=true',
    ],
    env: {
      ...defaultConfig.kbnTestServer.env,
      NODE_OPTIONS: '--enable-fips',
      OPENSSL_CONF: undefined,
      OPENSSL_CONF_INCLUDE: undefined,
      OPENSSL_MODULES: undefined,
    },
  },
};
