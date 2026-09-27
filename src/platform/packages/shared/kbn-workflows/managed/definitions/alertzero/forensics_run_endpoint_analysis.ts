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
import FORENSICS_RUN_ENDPOINT_ANALYSIS_YAML from './forensics_run_endpoint_analysis.yaml';
import type { ManagedWorkflowDefinition } from '../../types';

export const ALERTZERO_FORENSICS_RUN_ENDPOINT_ANALYSIS_WORKFLOW_ID =
  'system-security-forensics-run-endpoint-analysis';

/**
 * The forensic pass itself, installed once globally and dispatched per indicator by
 * the per-space Endpoint analysis worker, which is the only scheduler authority.
 */
export const ALERTZERO_FORENSICS_RUN_ENDPOINT_ANALYSIS_WORKFLOW = {
  billable: false,
  id: ALERTZERO_FORENSICS_RUN_ENDPOINT_ANALYSIS_WORKFLOW_ID,
  management: ALERTZERO_INTERNAL_WORKFLOW_MANAGEMENT,
  pluginId: ALERTZERO_MANAGED_WORKFLOW_PLUGIN_ID,
  version: 2,
  yaml: FORENSICS_RUN_ENDPOINT_ANALYSIS_YAML,
} as const satisfies ManagedWorkflowDefinition;
