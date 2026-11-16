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
import type { ManagedWorkflowDefinition } from '../../types';
import { readManagedWorkflowYaml } from '../read_managed_workflow_yaml';

export const ALERTZERO_FORENSICS_RUN_ENDPOINT_ANALYSIS_WORKFLOW_ID =
  'system-security-forensics-run-endpoint-analysis';

/**
 * The forensic pass itself, installed once globally and dispatched per indicator by
 * the per-space Endpoint analysis worker, which is the only scheduler authority.
 */
export const ALERTZERO_FORENSICS_RUN_ENDPOINT_ANALYSIS_WORKFLOW = {
  billable: true,
  id: ALERTZERO_FORENSICS_RUN_ENDPOINT_ANALYSIS_WORKFLOW_ID,
  management: ALERTZERO_INTERNAL_WORKFLOW_MANAGEMENT,
  pluginId: ALERTZERO_MANAGED_WORKFLOW_PLUGIN_ID,
  version: 17,
  get yaml() {
    return readManagedWorkflowYaml(__dirname, 'forensics_run_endpoint_analysis.yaml');
  },
} as const satisfies ManagedWorkflowDefinition;
