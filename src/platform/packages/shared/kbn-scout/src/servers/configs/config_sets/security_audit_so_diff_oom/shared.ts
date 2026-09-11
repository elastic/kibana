/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { securityAuditServerArgs } from '../security_audit/shared';

/**
 * Saved-object diff auditing on a 1.5 GB old-space heap. `index-pattern` and `dashboard`
 * are the public-API types the OOM and perf specs write. `fieldSizeLimit` is raised to
 * 100kb so dashboard `panelsJSON` strings (a single large field) are not truncated in the
 * audit log — the 48kb default would clip a 60-panel dashboard. Array values must be JSON
 * literals.
 */
export const securityAuditSoDiffOomServerArgs = [
  ...securityAuditServerArgs,
  '--xpack.security.audit.savedObjectDiff.enabled=true',
  '--xpack.security.audit.savedObjectDiff.typesToInclude=["index-pattern","dashboard"]',
  '--xpack.security.audit.savedObjectDiff.fieldSizeLimit=100kb',
];

/**
 * Tightest heap that still boots a full default Scout Kibana.
 * 1024 MB OOMs during plugin setup (~211 plugins; the workflows_oom_testing
 * suite can use 1024 because it starts from a reduced workflows_ui config).
 * 1536 MB boots and still fails if flatten/diff retains unbounded copies of
 * large nested objects.
 */
export const withConstrainedHeapEnv = (env?: { NODE_OPTIONS?: string }) => ({
  ...env,
  NODE_OPTIONS: [env?.NODE_OPTIONS, '--max-old-space-size=1536'].filter(Boolean).join(' '),
});
