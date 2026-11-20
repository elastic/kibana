/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { PROPOSALS_MANAGED_WORKFLOW_PLUGIN_ID, PROPOSALS_WORKFLOW_MANAGEMENT } from './constants';
import type { ManagedWorkflowDefinition } from '../../types';
import { readManagedWorkflowYaml } from '../read_managed_workflow_yaml';

export const RESOLVE_PROPOSAL_WORKFLOW_ID = 'system-resolve-proposal';

export const RESOLVE_PROPOSAL_WORKFLOW = {
  billable: false,
  id: RESOLVE_PROPOSAL_WORKFLOW_ID,
  management: PROPOSALS_WORKFLOW_MANAGEMENT,
  pluginId: PROPOSALS_MANAGED_WORKFLOW_PLUGIN_ID,
  version: 1,
  get yaml() {
    return readManagedWorkflowYaml(__dirname, 'resolve_proposal.yaml');
  },
} as const satisfies ManagedWorkflowDefinition;
