/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutServerConfig } from '../../../../../types';
import { servers as defaultConfig } from '../../default/serverless/security_complete.serverless.config';
import { savedObjectDiffKbnServerArgs } from '../../security_audit_so_diff/shared';
import { securityAuditOtelServerArgs, securityAuditOtelServerEnv } from '../shared';

export const servers: ScoutServerConfig = {
  ...defaultConfig,
  kbnTestServer: {
    ...defaultConfig.kbnTestServer,
    // Diffs on, so the spec can assert kibana.diff is serialized for the OTel SDK.
    serverArgs: [
      ...defaultConfig.kbnTestServer.serverArgs,
      ...securityAuditOtelServerArgs,
      ...savedObjectDiffKbnServerArgs,
    ],
    env: { ...defaultConfig.kbnTestServer.env, ...securityAuditOtelServerEnv },
  },
};
