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
import { securityAuditSoDiffPerfServerArgs, withConstrainedHeapEnv } from '../shared';

/**
 * Saved object diff performance measurements, diffs ON. Pair with
 * `security_audit_so_diff_perf_baseline` for an A/B. See
 * x-pack/platform/plugins/shared/security/test/scout_security_audit_so_diff_perf/README.md
 */
export const servers: ScoutServerConfig = {
  ...defaultConfig,
  kbnTestServer: {
    ...defaultConfig.kbnTestServer,
    serverArgs: [...defaultConfig.kbnTestServer.serverArgs, ...securityAuditSoDiffPerfServerArgs],
    env: withConstrainedHeapEnv(defaultConfig.kbnTestServer.env),
  },
};
