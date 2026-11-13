/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import KNOWLEDGE_SEARCH_YAML from './knowledge_search.yaml';
import type { ManagedWorkflowDefinition } from '../../../types';

export const ENDPOINT_KNOWLEDGE_SEARCH_WORKFLOW_ID = 'system-security-endpoint-knowledge-search';

export const ENDPOINT_KNOWLEDGE_SEARCH_WORKFLOW = {
  billable: false,
  id: ENDPOINT_KNOWLEDGE_SEARCH_WORKFLOW_ID,
  management: {
    enablement: 'enforced',
    lifecycle: 'static',
    versionStrategy: 'auto',
  },
  pluginId: 'securitySolution',
  version: 1,
  yaml: KNOWLEDGE_SEARCH_YAML,
} as const satisfies ManagedWorkflowDefinition;
