/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1".
 */

import CONVERSATION_SUMMARY_YAML from './conversation_summary.yaml';
import type { ManagedWorkflowDefinition } from '../../types';

export const CONVERSATION_SUMMARY_WORKFLOW_ID = 'system-conversation-summary';

/**
 * Must equal the id agentBuilder passes to `registerManagedWorkflowOwner`.
 * Managed and not billable: the agent execution is the metered cost.
 */
export const AGENT_BUILDER_MANAGED_WORKFLOW_PLUGIN_ID = 'agentBuilder';

export const CONVERSATION_SUMMARY_WORKFLOW = {
  billable: false,
  id: CONVERSATION_SUMMARY_WORKFLOW_ID,
  management: {
    enablement: 'enforced',
    lifecycle: 'static',
    versionStrategy: 'auto',
  },
  pluginId: AGENT_BUILDER_MANAGED_WORKFLOW_PLUGIN_ID,
  version: 1,
  yaml: CONVERSATION_SUMMARY_YAML,
} as const satisfies ManagedWorkflowDefinition;
