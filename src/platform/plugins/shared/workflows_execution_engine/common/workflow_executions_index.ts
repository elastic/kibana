/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import { TOKEN_USAGE_MAPPING } from './step_executions_index';

export const PLUGIN_ID = 'workflowsExecutionEngine';
export const PLUGIN_NAME = 'Workflows Execution Engine';

export const WORKFLOWS_EXECUTIONS_INDEX_PREFIX = '.workflows-executions';

/** Alias used for reads (fans out to all backing indexes) and new writes (routes to write index). */
export const WORKFLOWS_EXECUTIONS_INDEX = WORKFLOWS_EXECUTIONS_INDEX_PREFIX;

export const WORKFLOWS_EXECUTIONS_INDEX_PATTERN = `${WORKFLOWS_EXECUTIONS_INDEX_PREFIX}-*`;

export const WORKFLOWS_EXECUTIONS_INITIAL_INDEX = `${WORKFLOWS_EXECUTIONS_INDEX_PREFIX}-000001`;

export const WORKFLOWS_EXECUTIONS_INDEX_MAPPINGS: MappingTypeMapping = {
  dynamic: false,
  properties: {
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
