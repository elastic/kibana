/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import ENTITY_GRAPH_TRAVERSAL_YAML from './entity_graph_traversal.yaml';
import type { ManagedWorkflowDefinition } from '../../types';

export * from './scenarios';

export const SECURITY_ENTITY_GRAPH_TRAVERSAL_WORKFLOW_ID = 'system-security-entity-graph-traversal';

/**
 * Manual-only traversal of the entity graph by scenario. Installed once in the global space
 * by security_solution; never scheduled.
 */
export const SECURITY_ENTITY_GRAPH_TRAVERSAL_WORKFLOW = {
  billable: false,
  id: SECURITY_ENTITY_GRAPH_TRAVERSAL_WORKFLOW_ID,
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
  yaml: ENTITY_GRAPH_TRAVERSAL_YAML,
} as const satisfies ManagedWorkflowDefinition;
