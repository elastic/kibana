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
import type { MappingsToProperties } from '@kbn/es-mappings';
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
    }),
    event: mappings.object({
      action: mappings.keyword(),
      category: mappings.keyword(),
      type: mappings.keyword(),
      provider: mappings.keyword(),
      outcome: mappings.keyword(),
      duration: mappings.long(),
      start: mappings.date(),
      end: mappings.date(),
    }),
    error: mappings.object({
      message: mappings.text(),
      type: mappings.keyword(),
      stack_trace: mappings.text({ fields: undefined }),
    }),
  },
};

export type LogsRepositoryDoc = MappingsToProperties<typeof logsRepositoryMappings>;
export type LogsRepositoryDataStreamClient = IDataStreamClient<LogsRepositoryDoc, {}>;

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
