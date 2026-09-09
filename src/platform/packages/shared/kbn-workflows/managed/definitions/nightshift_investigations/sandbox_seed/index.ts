/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import SANDBOX_SEED_WORKFLOW_YAML from './sandbox_seed_workflow.yaml';
import type { ManagedWorkflowDefinition } from '../../../types';

export const SIGNIFICANT_EVENTS_SANDBOX_SEED_WORKFLOW_ID =
  'system-significant-events-sandbox-seed';

/**
 * Pre-execution workflow for the Nightshift investigator agent. On the first
 * round of a conversation it writes an orientation note into /workspace so the
 * agent starts with context already in the sandbox.
 *
 * `enablement: 'enforced'` — a disabled workflow makes the beforeAgent hook
 * throw, which aborts the investigation. Enablement must not be user-revocable
 * for a workflow that is unconditionally wired to the agent type.
 */
export const SIGNIFICANT_EVENTS_SANDBOX_SEED_WORKFLOW = {
  id: SIGNIFICANT_EVENTS_SANDBOX_SEED_WORKFLOW_ID,
  pluginId: 'nightshiftInvestigations',
  version: 1,
  billable: false,
  yaml: SANDBOX_SEED_WORKFLOW_YAML,
  management: {
    lifecycle: 'static',
    versionStrategy: 'auto',
    enablement: 'enforced',
  },
} as const satisfies ManagedWorkflowDefinition;
