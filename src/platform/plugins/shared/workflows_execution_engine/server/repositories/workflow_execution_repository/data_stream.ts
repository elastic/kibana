/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataStreamsSetup, DataStreamsStart } from '@kbn/core-data-streams-server';
import type { IDataStreamClient } from '@kbn/data-streams';
import type { MappingsDefinition } from '@kbn/es-mappings';
import { mappings } from '@kbn/es-mappings';
import { WORKFLOWS_EXECUTIONS_DATA_STREAM } from './constants';

export const initializeWorkflowExecutionDataStream = (coreDataStreams: DataStreamsSetup) => {
  return coreDataStreams.registerDataStream({
    name: WORKFLOWS_EXECUTIONS_DATA_STREAM,
    version: 1,
    template: {
      mappings: workflowExecutionMappings,
    },
  });
};

const workflowExecutionMappings = {
  dynamic: false,
  properties: {
    spaceId: mappings.keyword(),
    id: mappings.keyword(),
    workflowId: mappings.keyword(),
    status: mappings.keyword(),
    workflowDefinition: mappings.object({
      dynamic: false,
      properties: {},
    }),
    createdAt: mappings.date(),
    isTestRun: mappings.boolean(),
    createdBy: mappings.keyword(),
    executedBy: mappings.keyword(),
    startedAt: mappings.date(),
    finishedAt: mappings.date(),
    duration: mappings.long(),
    triggeredBy: mappings.keyword(),
    concurrencyGroupKey: mappings.keyword(),
    type: mappings.keyword(),
  },
} satisfies MappingsDefinition;

export type WorkflowExecutionDataStreamClient = IDataStreamClient<
  typeof workflowExecutionMappings,
  Record<string, unknown>
>;

export const initializeDataStreamClient = (
  coreDataStreams: DataStreamsStart
): Promise<WorkflowExecutionDataStreamClient> => {
  return coreDataStreams.initializeClient(WORKFLOWS_EXECUTIONS_DATA_STREAM);
};
