/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import RUN_QUOTA_RESET_YAML from './run_quota_reset.yaml';
import type { ManagedWorkflowDefinition } from '../../types';

export const SIGNIFICANT_EVENTS_RUN_QUOTA_RESET_WORKFLOW_ID =
  'system-significant-events-run-quota-reset';

/**
 * Daily cron workflow that resumes every engine paused by the run-quota gate.
 * Runs at 00:05 UTC so the new calendar day is firmly in effect before any
 * automation is un-blocked.
 */
export const SIGNIFICANT_EVENTS_RUN_QUOTA_RESET_WORKFLOW = {
  id: SIGNIFICANT_EVENTS_RUN_QUOTA_RESET_WORKFLOW_ID,
  pluginId: 'significantEvents',
  version: 1,
  billable: false,
  yaml: RUN_QUOTA_RESET_YAML,
  management: {
    lifecycle: 'static',
    versionStrategy: 'auto',
    enablement: 'enforced',
  },
} as const satisfies ManagedWorkflowDefinition;
