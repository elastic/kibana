/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { AUDIT_LOG_PATH, securityAuditServerArgs } from '../security_audit/shared';

export { AUDIT_LOG_PATH };

// Diff-only flags, shared with the Serverless OTel audit config set so both
// stacks allow-list the same types. Does not include the file-appender args —
// the OTel set has its own appender. Array values must be JSON literals.
export const savedObjectDiffKbnServerArgs = [
  '--xpack.security.audit.savedObjectDiff.enabled=true',
  '--xpack.security.audit.savedObjectDiff.typesToInclude=["index-pattern","action"]',
  '--xpack.security.audit.savedObjectDiff.fieldSizeLimit=10kb',
];

// The `security_audit` config set on top of saved object diff auditing. Kept as a
// separate config set so the base set keeps covering the default (diff-off) audit
// behavior. `typesToInclude` is an allow list (`index-pattern` for the public-API
// cases, `action` for the ESO import case); types not on it (e.g. `visualization`)
// let the spec prove diffs are withheld. A non-default `fieldSizeLimit` (10kb,
// below the 48kb default) lets the spec verify that config is honored. Array
// values must be JSON literals — the CLI runs each arg value through JSON.parse.
export const securityAuditSoDiffServerArgs = [
  ...securityAuditServerArgs,
  ...savedObjectDiffKbnServerArgs,
];
