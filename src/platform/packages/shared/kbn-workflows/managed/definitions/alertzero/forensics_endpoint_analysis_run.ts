/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  ALERTZERO_INTERNAL_WORKFLOW_MANAGEMENT,
  ALERTZERO_MANAGED_WORKFLOW_PLUGIN_ID,
} from './constants';
import FORENSICS_ENDPOINT_ANALYSIS_RUN_YAML from './forensics_endpoint_analysis_run.yaml';
import type { ManagedWorkflowDefinition } from '../../types';

export const ALERTZERO_FORENSICS_ENDPOINT_ANALYSIS_RUN_WORKFLOW_ID =
  'system-security-forensics-endpoint-analysis-run';

/**
 * Per-indicator forensic pass, invoked by the per-space Endpoint analysis
 * worker via `workflow.executeAsync`. Owns no Watch toggle, so enablement is
 * enforced rather than restorable.
 */
export const ALERTZERO_FORENSICS_ENDPOINT_ANALYSIS_RUN_WORKFLOW = {
  billable: false,
  id: ALERTZERO_FORENSICS_ENDPOINT_ANALYSIS_RUN_WORKFLOW_ID,
  management: ALERTZERO_INTERNAL_WORKFLOW_MANAGEMENT,
  pluginId: ALERTZERO_MANAGED_WORKFLOW_PLUGIN_ID,
  version: 2,
  yaml: FORENSICS_ENDPOINT_ANALYSIS_RUN_YAML,
} as const satisfies ManagedWorkflowDefinition;
