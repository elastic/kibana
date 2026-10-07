/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { rollDataStreamIfRequired } from './roll_data_stream_if_required';
import { WORKFLOWS_EXECUTION_LOGS_DATA_STREAM } from '../../repositories/logs_repository/constants';
import { WORKFLOWS_LOGS_MANAGED_INDEX_MAPPINGS_VERSION } from '../../repositories/logs_repository/data_stream';
import { WORKFLOWS_EVENTS_DATA_STREAM } from '../../trigger_events/event_logs/constants';
import { WORKFLOWS_EVENTS_MANAGED_INDEX_MAPPINGS_VERSION } from '../../trigger_events/event_logs/trigger_events_data_stream';

export async function ensureWorkflowsDataStreamsRolledOver(
  logger: Logger,
  esClient: ElasticsearchClient
): Promise<void> {
  const streams = [
    {
      dataStreamName: WORKFLOWS_EXECUTION_LOGS_DATA_STREAM,
      targetManagedIndexMappingsVersion: WORKFLOWS_LOGS_MANAGED_INDEX_MAPPINGS_VERSION,
    },
    {
      dataStreamName: WORKFLOWS_EVENTS_DATA_STREAM,
      targetManagedIndexMappingsVersion: WORKFLOWS_EVENTS_MANAGED_INDEX_MAPPINGS_VERSION,
    },
  ] as const;

  await Promise.all(
    streams.map(async ({ dataStreamName, targetManagedIndexMappingsVersion }) => {
      try {
        await rollDataStreamIfRequired({
          logger,
          esClient,
          dataStreamName,
          targetManagedIndexMappingsVersion,
        });
      } catch (error) {
        logger.error(
          `Error rolling over workflows data stream ${dataStreamName}: ${
            error instanceof Error ? error.message : String(error)
          }`,
          error instanceof Error ? { error: { stack_trace: error.stack } } : undefined
        );
      }
    })
  );
}
