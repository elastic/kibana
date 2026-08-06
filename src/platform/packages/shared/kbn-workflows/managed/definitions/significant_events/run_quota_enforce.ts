/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import RUN_QUOTA_ENFORCE_YAML from './run_quota_enforce.yaml';
import type { ManagedWorkflowDefinition } from '../../types';

export const SIGNIFICANT_EVENTS_RUN_QUOTA_ENFORCE_WORKFLOW_ID =
  'system-significant-events-run-quota-enforce';

// enablement: 'enforced' — this is the mechanism that applies the daily run
// limits, so it stays on; limits are turned off per budget group in Settings.
export const SIGNIFICANT_EVENTS_RUN_QUOTA_ENFORCE_WORKFLOW = {
  id: SIGNIFICANT_EVENTS_RUN_QUOTA_ENFORCE_WORKFLOW_ID,
  pluginId: 'significantEvents',
  version: 1,
  billable: false,
  yaml: RUN_QUOTA_ENFORCE_YAML,
  management: {
    lifecycle: 'static',
    versionStrategy: 'auto',
    enablement: 'enforced',
  },
} as const satisfies ManagedWorkflowDefinition;
