/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  AGENTIC_INVESTIGATIONS_MANAGED_WORKFLOW_PLUGIN_ID,
  AGENTIC_INVESTIGATIONS_WORKFLOW_MANAGEMENT,
} from './constants';
import CREATE_INVESTIGATION_PROPOSAL_YAML from './create_investigation_proposal.yaml';
import type { ManagedWorkflowDefinition } from '../../../types';

export const CREATE_INVESTIGATION_PROPOSAL_WORKFLOW_ID = 'system-create-investigation-proposal';

export const CREATE_INVESTIGATION_PROPOSAL_WORKFLOW = {
  billable: false,
  id: CREATE_INVESTIGATION_PROPOSAL_WORKFLOW_ID,
  management: AGENTIC_INVESTIGATIONS_WORKFLOW_MANAGEMENT,
  pluginId: AGENTIC_INVESTIGATIONS_MANAGED_WORKFLOW_PLUGIN_ID,
  version: 2,
  yaml: CREATE_INVESTIGATION_PROPOSAL_YAML,
} as const satisfies ManagedWorkflowDefinition;
