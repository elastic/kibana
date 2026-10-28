/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { servers as cpsLocalConfig } from '../../cps_local/serverless/security_complete.serverless.config';
import type { ScoutServerConfig } from '../../../../../types';

/**
 * Scout server config for AlertZero tests on the two-cluster CPS stack (origin + linked ES).
 * No Scout serverless config enables alertzero otherwise, and `cps_local` is the only set that
 * starts a linked cluster. CPS is driven by `esServerlessOptions.cps` and
 * `servers.linkedElasticsearch`, not by the set's name, so spreading it keeps the linked cluster.
 * `agenticInvestigations` and `proposals` are required by alertzero and default off.
 *
 * Usage:
 *   node scripts/scout.js start-server --arch serverless --domain security_complete --serverConfigSet cps_local_alertzero
 */
export const servers: ScoutServerConfig = {
  ...cpsLocalConfig,
  kbnTestServer: {
    ...cpsLocalConfig.kbnTestServer,
    serverArgs: [
      ...cpsLocalConfig.kbnTestServer.serverArgs,
      '--xpack.alertzero.enabled=true',
      '--xpack.agenticInvestigations.enabled=true',
      '--xpack.proposals.enabled=true',
      // Off by default on Serverless; alertzero stays unavailable (503) without them.
      '--xpack.security.serviceAccounts.enabled=true',
    ],
  },
};
