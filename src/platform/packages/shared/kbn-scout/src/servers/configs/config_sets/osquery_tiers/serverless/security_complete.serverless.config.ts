/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutServerConfig } from '../../../../../types';
import { servers as osqueryServerlessConfig } from '../../osquery/serverless/security_complete.serverless.config';

/**
 * Osquery tier testing config: security_complete domain with ONLY
 * the security complete PLI (no endpoint complete).
 *
 * This verifies that response actions are NOT available when only
 * the security complete product tier is active — endpoint complete
 * is required for response actions.
 *
 * The base osquery serverless config includes Fleet/Docker overrides
 * (host.docker.internal, es01, osquery_manager pre-install).
 * This config layers the restricted productTypes on top.
 */
export const servers: ScoutServerConfig = {
  ...osqueryServerlessConfig,
  kbnTestServer: {
    ...osqueryServerlessConfig.kbnTestServer,
    serverArgs: [
      ...osqueryServerlessConfig.kbnTestServer.serverArgs,
      `--xpack.securitySolutionServerless.productTypes=${JSON.stringify([
        { product_line: 'security', product_tier: 'complete' },
      ])}`,
    ],
  },
};
