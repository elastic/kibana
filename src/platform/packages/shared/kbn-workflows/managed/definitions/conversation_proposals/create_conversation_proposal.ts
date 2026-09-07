/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  CONVERSATION_PROPOSALS_MANAGED_WORKFLOW_PLUGIN_ID,
  CONVERSATION_PROPOSALS_WORKFLOW_MANAGEMENT,
} from './constants';
import CREATE_CONVERSATION_PROPOSAL_YAML from './create_conversation_proposal.yaml';
import type { ManagedWorkflowDefinition } from '../../types';

export const CREATE_CONVERSATION_PROPOSAL_WORKFLOW_ID = 'system-create-conversation-proposal';

export const CREATE_CONVERSATION_PROPOSAL_WORKFLOW = {
  billable: false,
  id: CREATE_CONVERSATION_PROPOSAL_WORKFLOW_ID,
  management: CONVERSATION_PROPOSALS_WORKFLOW_MANAGEMENT,
  pluginId: CONVERSATION_PROPOSALS_MANAGED_WORKFLOW_PLUGIN_ID,
  version: 1,
  yaml: CREATE_CONVERSATION_PROPOSAL_YAML,
} as const satisfies ManagedWorkflowDefinition;
