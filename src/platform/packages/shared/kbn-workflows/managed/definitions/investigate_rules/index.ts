/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import INVESTIGATE_RULES_WORKFLOW_YAML from './investigate_rules_workflow.yaml';
import type { ManagedWorkflowDefinition } from '../../types';

export const SECURITY_INVESTIGATE_RULES_WORKFLOW_ID = 'system-security-investigate-rules';

// PoC: installed once in the global space, disabled. `restorable` enablement keeps the
// user's enable/disable choice across managed updates — enabling the workflow (in the
// Workflows UI) is the explicit opt-in that also creates the API key its scheduled
// trigger runs under.
export const SECURITY_INVESTIGATE_RULES_WORKFLOW = {
  id: SECURITY_INVESTIGATE_RULES_WORKFLOW_ID,
  pluginId: 'securitySolution',
  version: 2,
  billable: false,
  visibility: {
    solutions: ['security'],
  },
  yaml: INVESTIGATE_RULES_WORKFLOW_YAML,
  management: {
    lifecycle: 'static',
    versionStrategy: 'auto',
    enablement: 'restorable',
  },
} as const satisfies ManagedWorkflowDefinition;
