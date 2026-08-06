/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import RUN_QUOTA_ENFORCE_YAML from './run_quota_enforce.yaml';
import type { ManagedWorkflowDefinition } from '../../types';

export const SIGNIFICANT_EVENTS_RUN_QUOTA_ENFORCE_WORKFLOW_ID =
  'system-significant-events-run-quota-enforce';

export const SIGNIFICANT_EVENTS_RUN_QUOTA_ENFORCE_WORKFLOW = {
  id: SIGNIFICANT_EVENTS_RUN_QUOTA_ENFORCE_WORKFLOW_ID,
  pluginId: 'significantEvents',
  version: 1,
  billable: false,
  yaml: RUN_QUOTA_ENFORCE_YAML,
  management: {
    lifecycle: 'static',
    versionStrategy: 'auto',
    enablement: 'restorable',
  },
} as const satisfies ManagedWorkflowDefinition;
