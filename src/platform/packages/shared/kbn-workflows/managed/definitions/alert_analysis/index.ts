/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import ALERT_ANALYSIS_WORKFLOW_YAML from './alert_analysis_workflow.yaml';
import type { ManagedWorkflowDefinition } from '../../types';

export const SECURITY_ALERT_ANALYSIS_WORKFLOW_ID = 'system-security-alert-analysis';

// Installed once in the global space. Per-space configuration (connector, thresholds, enabled,
// create-conversation) is not baked in here; the workflow reads it from the invoking space's
// uiSettings at run time (see the settings `kibana.request` step in alert_analysis_workflow.yaml),
// so a single static document serves every space with live config.
export const SECURITY_ALERT_ANALYSIS_WORKFLOW = {
  id: SECURITY_ALERT_ANALYSIS_WORKFLOW_ID,
  pluginId: 'securitySolution',
  version: 2,
  billable: false,
  visibility: {
    selectors: ['rule_action'],
    solutions: ['security'],
  },
  yaml: ALERT_ANALYSIS_WORKFLOW_YAML,
  management: {
    lifecycle: 'static',
    versionStrategy: 'auto',
    enablement: 'enforced',
  },
} as const satisfies ManagedWorkflowDefinition;
