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

// Note: Bump the version when you make changes to the definition.
export const initializeLogsRepositoryDataStream = (coreDataStreams: DataStreamsSetup) => {
  return coreDataStreams.registerDataStream({
    name: WORKFLOWS_EXECUTION_LOGS_DATA_STREAM,
    version: 3,
    template: {
      mappings: logsRepositoryMappings,
    },
  });
};

// Note: Only define schema for fields that will be queries against in ES.
const logsRepositoryMappings = {
  dynamic: false,
  properties: {
    '@timestamp': mappings.date(),
    spaceId: mappings.keyword(),
    level: mappings.keyword(),
    workflow: mappings.object({
      dynamic: false,
      properties: {
        id: mappings.keyword(),
        execution_id: mappings.keyword(),
        step_id: mappings.keyword(),
        step_execution_id: mappings.keyword(),
      },
    }),
  },
} satisfies MappingsDefinition;

// Note: Document all _source fields here.
export interface WorkflowLogEvent extends GetFieldsOf<typeof logsRepositoryMappings> {
  '@timestamp': string;
  message: string;
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
  transaction?: {
    workflow_transaction_id?: string;
    task_transaction_id?: string;
    name?: string;
    type?: string | null;
    is_triggered_by_alerting?: boolean;
    alerting_rule_id?: string;
    transaction_id?: string;
    outcome?: 'success' | 'failure';
  };
  trace?: {
    trace_id?: string;
  };
  error?: {
    message?: string;
    type?: string;
    stack_trace?: string;
  };
  tags?: string[];
  labels?: Record<string, string | number | undefined>;
}

export type LogsRepositoryDataStreamClient = IDataStreamClient<
  typeof logsRepositoryMappings,
  WorkflowLogEvent
>;

/**
 * Bump when Elasticsearch index mappings for the workflows execution logs data stream change.
 * Compared on startup against `mappings._meta.managed_index_mappings_version` on backing indices
 * to decide whether to schedule a lazy rollover.
 *
 * This is independent of `registerDataStream({ version })` above (template lifecycle) and from
 * `WORKFLOWS_EVENTS_MANAGED_INDEX_MAPPINGS_VERSION` — logs and events streams can bump separately.
 */
export const WORKFLOWS_LOGS_MANAGED_INDEX_MAPPINGS_VERSION = 2;

export const initializeDataStreamClient = (
  coreDataStreams: DataStreamsStart
): Promise<LogsRepositoryDataStreamClient> => {
  return coreDataStreams.initializeClient(WORKFLOWS_EXECUTION_LOGS_DATA_STREAM);
};
