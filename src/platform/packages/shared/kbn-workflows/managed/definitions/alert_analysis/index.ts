/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import ALERT_ANALYSIS_SINGLE_WORKFLOW_YAML from './alert_analysis_single_workflow.yaml';
import ALERT_ANALYSIS_WORKFLOW_YAML from './alert_analysis_workflow.yaml';
import type { ManagedWorkflowDefinition } from '../../types';

export const SECURITY_ALERT_ANALYSIS_WORKFLOW_ID = 'system-security-alert-analysis';
export const SECURITY_ALERT_ANALYSIS_SINGLE_WORKFLOW_ID = 'system-security-alert-analysis-single';

// Installed once in the global space. Per-space configuration (connector, thresholds, enabled,
// create-conversation) is not baked in here; the workflow reads it from the invoking space's
// uiSettings at run time (see the settings `kibana.request` step in alert_analysis_workflow.yaml),
// so a single static document serves every space with live config.
export const SECURITY_ALERT_ANALYSIS_WORKFLOW = {
  id: SECURITY_ALERT_ANALYSIS_WORKFLOW_ID,
  pluginId: 'securitySolution',
  version: 3,
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

// The per-alert child workflow. The parent ("Security Alert Analysis") reads the per-space runtime
// config once and fans out over its alert batch, invoking this workflow once per alert (in parallel)
// via a `workflow.execute` step. Running each alert as its own execution keeps `variables.*`
// accumulators and flow-control navigation isolated per alert.
//
// It is intentionally left out of `visibility`: unlike the parent (which is attachable as a rule
// action via the `rule_action` selector), this child is only ever invoked internally by the parent
// via `workflow.execute` by id, so it does not need to be surfaced to any selector or solution UI.
export const SECURITY_ALERT_ANALYSIS_SINGLE_WORKFLOW = {
  id: SECURITY_ALERT_ANALYSIS_SINGLE_WORKFLOW_ID,
  pluginId: 'securitySolution',
  version: 1,
  billable: false,
  yaml: ALERT_ANALYSIS_SINGLE_WORKFLOW_YAML,
  management: {
    lifecycle: 'static',
    versionStrategy: 'auto',
    enablement: 'enforced',
  },
} as const satisfies ManagedWorkflowDefinition;
