/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import { WORKFLOWS_EXECUTIONS_INDEX } from '@kbn/workflows';
import { TOKEN_USAGE_MAPPING } from './step_executions_index';

export { WORKFLOWS_EXECUTIONS_INDEX };

export const PLUGIN_ID = 'workflowsExecutionEngine';
export const PLUGIN_NAME = 'Workflows Execution Engine';

export const WORKFLOWS_EXECUTIONS_INDEX_MAPPINGS: MappingTypeMapping = {
  dynamic: false,
  properties: {
    '@timestamp': {
      type: 'date',
    },
    spaceId: {
      type: 'keyword',
    },
    id: {
      type: 'keyword',
    },
    workflowId: {
      type: 'keyword',
    },
    managed: {
      type: 'boolean',
    },
    managedBy: {
      type: 'keyword',
    },
    originManagedWorkflowId: {
      type: 'keyword',
    },
    managedVersion: {
      type: 'long',
    },
    status: {
      type: 'keyword',
    },
    workflowDefinition: {
      type: 'object',
      enabled: false,
    },
    createdAt: {
      type: 'date',
    },
    isTestRun: {
      type: 'boolean',
    },
    // Only exists in single step test executions
    stepId: {
      type: 'keyword',
    },
    createdBy: {
      type: 'keyword',
    },
    executedBy: {
      type: 'keyword',
    },
    startedAt: {
      type: 'date',
    },
    finishedAt: {
      type: 'date',
    },
    duration: {
      type: 'long',
    },
    triggeredBy: {
      type: 'keyword',
    },
    eventChainDepth: {
      type: 'long',
    },
    eventChainVisitedWorkflowIds: {
      type: 'keyword',
    },
    dispatchEventId: {
      type: 'keyword',
    },
    concurrencyGroupKey: {
      type: 'keyword',
    },
    // Aggregated token usage across all token-consuming steps, accumulated
    // incrementally as each step finishes.
    usage: TOKEN_USAGE_MAPPING,
  },
};

/**
 * Bump when Elasticsearch index mappings for the workflows executions data stream change.
 */
export const WORKFLOWS_EXECUTIONS_MANAGED_INDEX_MAPPINGS_VERSION = 1;
