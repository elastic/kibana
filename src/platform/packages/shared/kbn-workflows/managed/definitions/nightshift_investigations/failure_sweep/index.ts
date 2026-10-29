/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import FAILURE_SWEEP_YAML from './failure_sweep_workflow.yaml';
import type { ManagedWorkflowDefinition } from '../../../types';

export const NIGHTSHIFT_INVESTIGATION_FAILURE_SWEEP_WORKFLOW_ID =
  'system-nightshift-investigation-failure-sweep';

export const NIGHTSHIFT_INVESTIGATION_FAILURE_SWEEP_WORKFLOW = {
  id: NIGHTSHIFT_INVESTIGATION_FAILURE_SWEEP_WORKFLOW_ID,
  pluginId: 'nightshiftInvestigations',
  version: 1,
  billable: false,
  yaml: FAILURE_SWEEP_YAML,
  management: { lifecycle: 'static', versionStrategy: 'auto', enablement: 'restorable' },
} as const satisfies ManagedWorkflowDefinition;
