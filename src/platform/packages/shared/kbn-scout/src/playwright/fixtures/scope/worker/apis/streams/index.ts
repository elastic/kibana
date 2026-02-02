/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Condition, StreamlangDSL } from '@kbn/streamlang';
import type { IngestStream, IngestUpsertRequest } from '@kbn/streams-schema/src/models/ingest';
import { WiredStream } from '@kbn/streams-schema/src/models/ingest/wired';
import { ClassicStream } from '@kbn/streams-schema/src/models/ingest/classic';
import type { RoutingStatus } from '@kbn/streams-schema';
import { omit } from 'lodash';
import type { KbnClient, ScoutLogger } from '../../../../../../common';
import { measurePerformanceAsync } from '../../../../../../common';
import type { ScoutSpaceParallelFixture } from '../../scout_space';

export interface StreamsApiService {
  enable: () => Promise<void>;
  disable: () => Promise<void>;
  forkStream: (
    streamName: string,
    destination: string,
    condition: Condition,
    status?: RoutingStatus
  ) => Promise<void>;
  getStreamDefinition: (streamName: string) => Promise<IngestStream.all.GetResponse>;
  deleteStream: (streamName: string) => Promise<void>;
  updateStream: (streamName: string, updateBody: { ingest: IngestUpsertRequest }) => Promise<void>;
  clearStreamChildren: (streamName: string) => Promise<void>;
  clearStreamMappings: (streamName: string) => Promise<void>;
  clearStreamProcessors: (streamName: string) => Promise<void>;
  updateStreamProcessors: (
    streamName: string,
    getProcessors: StreamlangDSL | ((prevProcessors: StreamlangDSL) => StreamlangDSL)
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
    forkStream: async (
      streamName: string,
      newStreamName: string,
      condition: Condition,
      status: RoutingStatus = 'enabled'
    ) => {
      await measurePerformanceAsync(log, 'streamsApi.createRoutingRule', async () => {
        await kbnClient.request({
          method: 'POST',
          path: `${basePath}/api/streams/${streamName}/_fork`,
          body: {
            where: condition,
            status,
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
    updateStream: async (streamName: string, updateBody: { ingest: IngestUpsertRequest }) => {
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
    clearStreamMappings: async (streamName: string) => {
      await measurePerformanceAsync(log, 'streamsApi.clearStreamMappings', async () => {
        const definition = await service.getStreamDefinition(streamName);
        if (WiredStream.Definition.is(definition.stream)) {
          await service.updateStream(streamName, {
            ingest: {
              ...definition.stream.ingest,
              processing: omit(definition.stream.ingest.processing, 'updated_at'),
              wired: {
                ...definition.stream.ingest.wired,
                fields: {},
              },
            },
          });
        } else if (ClassicStream.Definition.is(definition.stream)) {
          await service.updateStream(streamName, {
            ingest: {
              ...definition.stream.ingest,
              processing: omit(definition.stream.ingest.processing, 'updated_at'),
              classic: {
                ...definition.stream.ingest.classic,
                field_overrides: {},
              },
            },
          });
        } else {
          throw new Error(
            `Stream ${streamName} is not a wired or classic stream, cannot clear mappings.`
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
            processing: {
              steps: [],
            },
          },
        });
      });
    },
    updateStreamProcessors: async (
      streamName: string,
      getProcessors: StreamlangDSL | ((prevProcessors: StreamlangDSL) => StreamlangDSL)
    ) => {
      await measurePerformanceAsync(log, 'streamsApi.updateStreamProcessors', async () => {
        const definition = await service.getStreamDefinition(streamName);
        const processing = !(typeof getProcessors === 'function')
          ? getProcessors
          : getProcessors(definition.stream.ingest.processing);
        await service.updateStream(streamName, {
          ingest: {
            ...definition.stream.ingest,
            processing: {
              ...processing,
            },
          },
        });
      });
    },
  };

  return service;
};
