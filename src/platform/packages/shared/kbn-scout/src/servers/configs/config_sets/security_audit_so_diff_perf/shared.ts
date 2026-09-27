/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { securityAuditServerArgs } from '../security_audit/shared';
import { securityAuditSoDiffOomServerArgs } from '../security_audit_so_diff_oom/shared';

export { withConstrainedHeapEnv } from '../security_audit_so_diff_oom/shared';

// 2s ops collection so /api/stats event loop and heap samples track the workloads closely.
const OPS_INTERVAL_ARG = '--ops.interval=2000';

/** Diffs ON: the OOM config set's flags (1.5 GB heap, `index-pattern` allow-listed). */
export const securityAuditSoDiffPerfServerArgs = [
  ...securityAuditSoDiffOomServerArgs,
  OPS_INTERVAL_ARG,
];

/** Diffs OFF baseline: same audit appender and heap, feature disabled. */
export const securityAuditSoDiffPerfBaselineServerArgs = [
  ...securityAuditServerArgs,
  '--xpack.security.audit.savedObjectDiff.enabled=false',
  OPS_INTERVAL_ARG,
];
