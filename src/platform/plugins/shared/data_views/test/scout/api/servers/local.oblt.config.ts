/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutServerConfig } from '@kbn/scout/src/types';

export const servers: ScoutServerConfig = {
  esTestCluster: {
    license: 'trial',
    from: 'snapshot',
    serverArgs: ['xpack.security.authc.api_key.enabled=true', 'xpack.apm_data.enabled=true'],
  },
  kbnTestServer: {
    buildArgs: [],
    sourceArgs: [],
    serverArgs: [
      '--logging.root.level=info',
      '--serverless=oblt',
      '--coreApp.allowDynamicConfigOverrides=true',
      '--xpack.uptime.service.manifestUrl=mockDevUrl',
      // Explicitly ensure data views plugin is enabled
      '--plugins.enabled=true',
    ],
    env: {
      ELASTIC_APM_ACTIVE: 'false',
    },
  },
};
