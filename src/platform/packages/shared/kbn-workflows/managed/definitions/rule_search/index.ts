/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ManagedWorkflowDefinition } from '../../types';
import { readManagedWorkflowYaml } from '../read_managed_workflow_yaml';

export const SECURITY_RULE_SEARCH_INDEX_WORKFLOW_ID = 'system-security-rule-search-index';

// Installed once per space (suffix: the space id) and shipped disabled: an admin turns search by
// meaning on for a space by enabling it. `restorable` keeps that choice across managed updates.
export const SECURITY_RULE_SEARCH_INDEX_WORKFLOW = {
  billable: false,
  id: SECURITY_RULE_SEARCH_INDEX_WORKFLOW_ID,
  management: {
    enablement: 'restorable',
    lifecycle: 'static',
    versionStrategy: 'auto',
  },
  pluginId: 'securitySolution',
  version: 1,
  visibility: {
    solutions: ['security'],
  },
  get yaml() {
    return readManagedWorkflowYaml(__dirname, 'rule_search_index.yaml');
  },
} as const satisfies ManagedWorkflowDefinition;
