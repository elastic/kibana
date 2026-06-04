/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { servers as cpsConfig } from '../../cps_local/serverless/security_complete.serverless.config';
import type { ScoutServerConfig } from '../../../../../types';

/**
 * Dev-only variant of `cps_local` for interactively running a CPS + UIAM serverless
 * security Kibana with alerting v2 enabled.
 *
 * Differences from `cps_local`:
 *  - Drops the `securityTestEndpoints` test plugin (`--plugin-path=.../security_functional/
 *    plugins/test_endpoints`). That plugin declares `browser: true`; when the dev optimizer
 *    doesn't serve its public bundle, the browser fatally crashes with
 *    `Definition of plugin "securityTestEndpoints" not found`. It's only needed by automated
 *    `scout run-tests` flows, not for manual browsing.
 *  - Enables `xpack.alerting_v2.enabled` so the alerting v2 server plugin starts and installs
 *    its resources (e.g. the `.rule-events` data stream).
 */
export const servers: ScoutServerConfig = {
  ...cpsConfig,
  kbnTestServer: {
    ...cpsConfig.kbnTestServer,
    serverArgs: [
      ...cpsConfig.kbnTestServer.serverArgs.filter(
        (arg) => !arg.includes('security_functional/plugins/test_endpoints')
      ),
      '--xpack.alerting_v2.enabled=true',
    ],
  },
};
