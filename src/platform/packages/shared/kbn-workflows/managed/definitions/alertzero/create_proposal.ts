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
import ALERTZERO_CREATE_PROPOSAL_YAML from './create_proposal.yaml';
import type { ManagedWorkflowDefinition } from '../../types';

export const ALERTZERO_CREATE_PROPOSAL_WORKFLOW_ID = 'system-create-alertzero-proposal';

/**
 * Child-only bridge to `system-create-proposal` that stamps `origin: alertzero`.
 * Every AlertZero workflow raises proposals through this rather than the gate.
 */
export const ALERTZERO_CREATE_PROPOSAL_WORKFLOW = {
  billable: false,
  id: ALERTZERO_CREATE_PROPOSAL_WORKFLOW_ID,
  management: ALERTZERO_INTERNAL_WORKFLOW_MANAGEMENT,
  pluginId: ALERTZERO_MANAGED_WORKFLOW_PLUGIN_ID,
  version: 1,
  yaml: ALERTZERO_CREATE_PROPOSAL_YAML,
} as const satisfies ManagedWorkflowDefinition;
