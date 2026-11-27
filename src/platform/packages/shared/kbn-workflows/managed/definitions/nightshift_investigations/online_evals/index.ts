/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ManagedWorkflowDefinition } from '../../../types';
import { readManagedWorkflowYaml } from '../../read_managed_workflow_yaml';

export const NIGHTSHIFT_ONLINE_EVALS_WORKFLOW_ID = 'system-nightshift-online-evals';

/**
 * Scores an investigation round for online evals. Installed globally with no schedule or event
 * trigger: only the investigation workflow starts it, asynchronously and with its own identity,
 * so scoring never holds up or fails an investigation.
 *
 * `enablement: 'enforced'` — scoring is paused with the `nightshift.onlineEvals.paused` flag,
 * not by disabling the workflow.
 */
export const NIGHTSHIFT_ONLINE_EVALS_WORKFLOW = {
  id: NIGHTSHIFT_ONLINE_EVALS_WORKFLOW_ID,
  pluginId: 'nightshiftInvestigations',
  version: 1,
  billable: false,
  get yaml() {
    return readManagedWorkflowYaml(__dirname, 'online_evals_workflow.yaml');
  },
  management: {
    lifecycle: 'static',
    versionStrategy: 'auto',
    enablement: 'enforced',
  },
} as const satisfies ManagedWorkflowDefinition;
