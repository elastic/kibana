/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutServerConfig } from '../../../../../types';
import { servers as defaultConfig } from '../../default/stateful/classic.stateful.config';
import { securityAuditSoDiffOomServerArgs, withConstrainedHeapEnv } from '../shared';

/**
 * Scout server configuration for saved-object audit-diff OOM prevention tests.
 * Constrains Kibana to 1.5 GB old-space heap so a deep flatten/diff on a large
 * nested object (or a bulk of them) fails the suite if it grows unbounded.
 *
 * Usage:
 *   node scripts/scout start-server --arch stateful --domain classic --serverConfigSet security_audit_so_diff_oom
 */
export const servers: ScoutServerConfig = {
  ...defaultConfig,
  kbnTestServer: {
    ...defaultConfig.kbnTestServer,
    serverArgs: [...defaultConfig.kbnTestServer.serverArgs, ...securityAuditSoDiffOomServerArgs],
    env: withConstrainedHeapEnv(defaultConfig.kbnTestServer.env),
  },
};
