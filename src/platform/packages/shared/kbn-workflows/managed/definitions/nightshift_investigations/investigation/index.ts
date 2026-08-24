/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import INVESTIGATION_WORKFLOW_YAML from './investigation_workflow.yaml';
import type { ManagedWorkflowDefinition } from '../../../types';

export const SIGNIFICANT_EVENTS_INVESTIGATION_WORKFLOW_ID =
  'system-significant-events-investigation';

// Ownership transferred from 'significantEvents' to 'nightshiftInvestigations' so the
// workflow can be triggered for any entity (alerts, synthetics monitors, etc.), not just
// significant events. The `version` bump (6 -> 7) is required to force a managed rewrite
// of `managedBy` on the persisted document — the YAML content is unchanged, and without a
// version/hash change the install path would short-circuit and never touch `managedBy`.
export const SIGNIFICANT_EVENTS_INVESTIGATION_WORKFLOW = {
  id: SIGNIFICANT_EVENTS_INVESTIGATION_WORKFLOW_ID,
  pluginId: 'nightshiftInvestigations',
  version: 7,
  billable: false,
  yaml: INVESTIGATION_WORKFLOW_YAML,
  management: {
    lifecycle: 'static',
    versionStrategy: 'auto',
    enablement: 'restorable',
  },
} as const satisfies ManagedWorkflowDefinition;
