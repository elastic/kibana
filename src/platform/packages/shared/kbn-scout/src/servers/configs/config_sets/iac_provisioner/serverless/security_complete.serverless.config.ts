/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutServerConfig } from '../../../../../types';
import { servers as securityServerlessConfig } from '../../default/serverless/security_complete.serverless.config';
import { iacProvisionerServerArgs } from '../shared';

/**
 * Scout server configuration for the Fleet IaC Provisioner render route.
 *
 * Runs on Serverless (security) so the handler's agentless/cloud gate is
 * satisfied, with the agentless prerequisite and the iacProvisioner flag
 * enabled so the internal render route is registered.
 */
export const servers: ScoutServerConfig = {
  ...securityServerlessConfig,
  kbnTestServer: {
    ...securityServerlessConfig.kbnTestServer,
    serverArgs: [...securityServerlessConfig.kbnTestServer.serverArgs, ...iacProvisionerServerArgs],
  },
};
