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
import type { GetFieldsOf, MappingsDefinition } from '@kbn/es-mappings';
import { mappings } from '@kbn/es-mappings';
import { WORKFLOWS_EXECUTION_LOGS_DATA_STREAM } from './constants';

const logsRepositoryMappings = {
  dynamic: false,
  properties: {
    '@timestamp': mappings.date(),
    spaceId: mappings.keyword(),
    message: mappings.text(),
    level: mappings.keyword(),
    tags: mappings.keyword(),
    workflow: mappings.object({
      properties: {
        id: mappings.keyword(),
        name: mappings.text({
          fields: {
            keyword: {
              type: 'keyword',
              ignore_above: 256,
            },
          },
        }),
        execution_id: mappings.keyword(),
        step_id: mappings.keyword(),
        step_name: mappings.text({
          fields: {
            keyword: {
              type: 'keyword',
              ignore_above: 256,
            },
          },
        }),
        step_type: mappings.keyword(),
      },
    }),
    event: mappings.object({
      properties: {
        action: mappings.keyword(),
        category: mappings.keyword(),
        type: mappings.keyword(),
        provider: mappings.keyword(),
        outcome: mappings.keyword(),
        duration: mappings.long(),
        start: mappings.date(),
        end: mappings.date(),
      },
    }),
    error: mappings.object({
      properties: {
        message: mappings.text(),
        type: mappings.keyword(),
        stack_trace: mappings.text({ fields: undefined }),
      },
    }),
  },
} satisfies MappingsDefinition;

export interface WorkflowLogEvent extends GetFieldsOf<typeof logsRepositoryMappings> {
  '@timestamp'?: string;
  message?: string;
  level?: 'trace' | 'debug' | 'info' | 'warn' | 'error';
  workflow?: {
    id?: string;
    name?: string;
    execution_id?: string;
    step_id?: string;
    step_execution_id?: string;
    step_name?: string;
    step_type?: string;
  };
  event?: {
    action?: string;
    category?: string[];
    type?: string[];
    provider?: string;
    outcome?: 'success' | 'failure' | 'unknown';
    duration?: number;
    start?: string;
    end?: string;
  };
  error?: {
    message?: string;
    type?: string;
    stack_trace?: string;
  };
  tags?: string[];
}

export type LogsRepositoryDataStreamClient = IDataStreamClient<
  typeof logsRepositoryMappings,
  WorkflowLogEvent
>;

export const getDataStreamClient = (
  coreDataStreams: DataStreamsStart
): LogsRepositoryDataStreamClient => {
  return coreDataStreams.getClient(WORKFLOWS_EXECUTION_LOGS_DATA_STREAM);
};

export const initializeLogsRepositoryDataStream = (coreDataStreams: DataStreamsSetup) => {
  return coreDataStreams.registerDataStream({
    name: WORKFLOWS_EXECUTION_LOGS_DATA_STREAM,
    version: 1,
    template: {
      mappings: logsRepositoryMappings,
    },
  });
};
