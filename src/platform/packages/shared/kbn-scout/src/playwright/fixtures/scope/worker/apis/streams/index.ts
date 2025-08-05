/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Condition, ProcessorDefinition } from '@kbn/streams-schema';
import { type Ingest, IngestStream } from '@kbn/streams-schema/src/models/ingest';
import { WiredStream } from '@kbn/streams-schema/src/models/ingest/wired';
import { KbnClient, ScoutLogger, measurePerformanceAsync } from '../../../../../../common';
import { ScoutSpaceParallelFixture } from '../../scout_space';

export interface StreamsApiService {
  enable: () => Promise<void>;
  disable: () => Promise<void>;
  forkStream: (streamName: string, destination: string, condition: Condition) => Promise<void>;
  getStreamDefinition: (streamName: string) => Promise<IngestStream.all.GetResponse>;
  deleteStream: (streamName: string) => Promise<void>;
  updateStream: (streamName: string, updateBody: { ingest: Ingest }) => Promise<void>;
  clearStreamChildren: (streamName: string) => Promise<void>;
  clearStreamProcessors: (streamName: string) => Promise<void>;
  updateStreamProcessors: (
    streamName: string,
    getProcessors:
      | ProcessorDefinition[]
      | ((prevProcessors: ProcessorDefinition[]) => ProcessorDefinition[])
  ) => Promise<void>;
}

export const getStreamsApiService = ({
  kbnClient,
  log,
  scoutSpace,
}: {
  kbnClient: KbnClient;
  log: ScoutLogger;
  scoutSpace?: ScoutSpaceParallelFixture;
}): StreamsApiService => {
  const basePath = scoutSpace?.id ? `/s/${scoutSpace?.id}` : '';

  const service = {
    enable: async () => {
      await measurePerformanceAsync(log, 'streamsApi.enable', async () => {
        await kbnClient.request({
          method: 'POST',
          path: `${basePath}/api/streams/_enable`,
        });
      });
    },
    disable: async () => {
      await measurePerformanceAsync(log, 'streamsApi.disable', async () => {
        await kbnClient.request({
          method: 'POST',
          path: `${basePath}/api/streams/_disable`,
        });
      });
    },
    forkStream: async (streamName: string, newStreamName: string, condition: Condition) => {
      await measurePerformanceAsync(log, 'streamsApi.createRoutingRule', async () => {
        await kbnClient.request({
          method: 'POST',
          path: `${basePath}/api/streams/${streamName}/_fork`,
          body: {
            if: condition,
            stream: {
              name: newStreamName,
            },
          },
        });
      });
    },
    getStreamDefinition: (streamName: string) => {
      return measurePerformanceAsync(log, 'streamsApi.getStreamDefinition', async () => {
        const response = await kbnClient.request({
          method: 'GET',
          path: `${basePath}/api/streams/${streamName}`,
        });
        return response.data as IngestStream.all.GetResponse;
      });
    },
    deleteStream: async (streamName: string) => {
      await measurePerformanceAsync(log, 'streamsApi.deleteStream', async () => {
        await kbnClient.request({
          method: 'DELETE',
          path: `${basePath}/api/streams/${streamName}`,
        });
      });
    },
    updateStream: async (streamName: string, updateBody: { ingest: Ingest }) => {
      await measurePerformanceAsync(log, 'streamsApi.updateStream', async () => {
        await kbnClient.request({
          method: 'PUT',
          path: `${basePath}/api/streams/${streamName}/_ingest`,
          body: updateBody,
        });
      });
    },
    clearStreamChildren: async (streamName: string) => {
      await measurePerformanceAsync(log, 'streamsApi.clearStreamChildren', async () => {
        const definition = await service.getStreamDefinition(streamName);
        if (WiredStream.Definition.is(definition.stream)) {
          await Promise.all(
            definition.stream.ingest.wired.routing.map((child) =>
              service.deleteStream(child.destination)
            )
          );
        }
      });
    },
    clearStreamProcessors: async (streamName: string) => {
      await measurePerformanceAsync(log, 'streamsApi.clearStreamProcessors', async () => {
        const definition = await service.getStreamDefinition(streamName);
        await service.updateStream(streamName, {
          ingest: {
            ...definition.stream.ingest,
            processing: [],
          },
        });
      });
    },
    updateStreamProcessors: async (
      streamName: string,
      getProcessors:
        | ProcessorDefinition[]
        | ((prevProcessors: ProcessorDefinition[]) => ProcessorDefinition[])
    ) => {
      await measurePerformanceAsync(log, 'streamsApi.updateStreamProcessors', async () => {
        const definition = await service.getStreamDefinition(streamName);
        const processing = Array.isArray(getProcessors)
          ? getProcessors
          : getProcessors(definition.stream.ingest.processing);
        await service.updateStream(streamName, {
          ingest: {
            ...definition.stream.ingest,
            processing,
          },
        });
      });
    },
  };

  return service;
};
