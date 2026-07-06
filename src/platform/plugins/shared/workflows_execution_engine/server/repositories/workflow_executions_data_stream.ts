/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  DataStreamsSetup,
  DataStreamsStart,
  IDataStreamClient,
} from '@kbn/core-data-streams-server';
import type { GetFieldsOf, MappingsDefinition } from '@kbn/es-mappings';
import { mappings } from '@kbn/es-mappings';
import { WORKFLOWS_EXECUTIONS_DS } from '@kbn/workflows';
import { TOKEN_USAGE_MAPPING } from './step_executions_data_stream';

export const PLUGIN_ID = 'workflowsExecutionEngine';
export const PLUGIN_NAME = 'Workflows Execution Engine';

export const WORKFLOWS_EXECUTIONS_MANAGED_INDEX_MAPPINGS_VERSION = 1;

export const WORKFLOWS_EXECUTIONS_DS_MAPPINGS = {
  dynamic: false,
  properties: {
    '@timestamp': mappings.date(),
    spaceId: mappings.keyword(),
    id: mappings.keyword(),
    workflowId: mappings.keyword(),
    managed: mappings.boolean(),
    managedBy: mappings.keyword(),
    originManagedWorkflowId: mappings.keyword(),
    managedVersion: mappings.long(),
    status: mappings.keyword(),
    workflowDefinition: mappings.object({
      enabled: false,
      properties: {},
    }),
    createdAt: mappings.date(),
    isTestRun: mappings.boolean(),
    // Only exists in single step test executions
    stepId: mappings.keyword(),
    createdBy: mappings.keyword(),
    executedBy: mappings.keyword(),
    startedAt: mappings.date(),
    finishedAt: mappings.date(),
    duration: mappings.long(),
    triggeredBy: mappings.keyword(),
    eventChainDepth: mappings.long(),
    eventChainVisitedWorkflowIds: mappings.keyword(),
    dispatchEventId: mappings.keyword(),
    concurrencyGroupKey: mappings.keyword(),
    // Aggregated token usage across all token-consuming steps, accumulated
    // incrementally as each step finishes.
    usage: TOKEN_USAGE_MAPPING,
    // Per-step token usage, retained on the workflow execution so callers can
    // query usage by producing step and resolved connector.
    stepUsage: mappings.object({
      properties: {
        stepId: mappings.keyword(),
        connectorId: mappings.keyword(),
        inputTokens: mappings.long(),
        outputTokens: mappings.long(),
        cachedTokens: mappings.long(),
        totalTokens: mappings.long(),
      },
    }),
    version: mappings.long(),
  },
} satisfies MappingsDefinition;

export type EsWorkflowExecutionEntry = GetFieldsOf<typeof WORKFLOWS_EXECUTIONS_DS_MAPPINGS>;

export type WorkflowExecutionsDataStreamClient = IDataStreamClient<
  typeof WORKFLOWS_EXECUTIONS_DS_MAPPINGS,
  EsWorkflowExecutionEntry
>;

// Note: Bump the version when you make changes to the definition.
export const initializeWorkflowExecutionsDataStream = (coreDataStreams: DataStreamsSetup): void => {
  coreDataStreams.registerDataStream({
    name: WORKFLOWS_EXECUTIONS_DS,
    version: 1,
    hidden: true,
    template: {
      mappings: WORKFLOWS_EXECUTIONS_DS_MAPPINGS,
    },
  });
};

export const initializeWorkflowExecutionsClient = (coreDataStreams: DataStreamsStart) => {
  return coreDataStreams.initializeClient(WORKFLOWS_EXECUTIONS_DS);
};
