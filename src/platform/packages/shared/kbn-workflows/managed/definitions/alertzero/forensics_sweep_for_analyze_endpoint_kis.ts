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
import FORENSICS_SWEEP_FOR_ANALYZE_ENDPOINT_KIS_YAML from './forensics_sweep_for_analyze_endpoint_kis.yaml';
import type { ManagedWorkflowDefinition } from '../../types';

export const ALERTZERO_FORENSICS_SWEEP_FOR_ANALYZE_ENDPOINT_KIS_WORKFLOW_ID =
  'system-security-forensics-sweep-for-analyze-endpoint-kis';

/**
 * Global KI sweep. Starts the per-space Endpoint analysis worker via the
 * space-scoped run API.
 */
export const ALERTZERO_FORENSICS_SWEEP_FOR_ANALYZE_ENDPOINT_KIS_WORKFLOW = {
  billable: false,
  id: ALERTZERO_FORENSICS_SWEEP_FOR_ANALYZE_ENDPOINT_KIS_WORKFLOW_ID,
  management: ALERTZERO_INTERNAL_WORKFLOW_MANAGEMENT,
  pluginId: ALERTZERO_MANAGED_WORKFLOW_PLUGIN_ID,
  version: 1,
  yaml: FORENSICS_SWEEP_FOR_ANALYZE_ENDPOINT_KIS_YAML,
} as const satisfies ManagedWorkflowDefinition;
