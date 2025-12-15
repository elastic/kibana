/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { omit } from 'lodash';
import type { KbnClient, ScoutLogger } from '../../../../../../common';
import { measurePerformanceAsync } from '../../../../../../common';
import type { ScoutSpaceParallelFixture } from '../../scout_space';

/**
 * Type definitions for Streams API service.
 * Consumers can provide specific types by extending this interface.
 */
export interface StreamsApiServiceTypes {
  condition?: unknown;
  streamlangDSL?: unknown;
  routingStatus?: string;
  streamDefinition?: unknown;
  ingestUpsertRequest?: unknown;
}

/**
 * Helper type to extract a type from StreamsApiServiceTypes with a default fallback.
 */
type WithDefault<
  T extends StreamsApiServiceTypes,
  K extends keyof StreamsApiServiceTypes,
  Default
> = T[K] extends undefined ? Default : T[K];

export interface StreamsApiService<T extends StreamsApiServiceTypes = {}> {
  enable: () => Promise<void>;
  disable: () => Promise<void>;
  forkStream: (
    streamName: string,
    destination: string,
    condition: WithDefault<T, 'condition', unknown>,
    status?: WithDefault<T, 'routingStatus', string>
  ) => Promise<void>;
  getStreamDefinition: (streamName: string) => Promise<WithDefault<T, 'streamDefinition', unknown>>;
  deleteStream: (streamName: string) => Promise<void>;
  updateStream: (
    streamName: string,
    updateBody: {
      ingest: WithDefault<T, 'ingestUpsertRequest', unknown>;
    }
  ) => Promise<void>;
  clearStreamChildren: (streamName: string) => Promise<void>;
  clearStreamMappings: (streamName: string) => Promise<void>;
  clearStreamProcessors: (streamName: string) => Promise<void>;
  updateStreamProcessors: (
    streamName: string,
    getProcessors:
      | WithDefault<T, 'streamlangDSL', unknown>
      | ((
          prevProcessors: WithDefault<T, 'streamlangDSL', unknown>
        ) => WithDefault<T, 'streamlangDSL', unknown>)
  ) => Promise<void>;
}

export const getStreamsApiService = <T extends StreamsApiServiceTypes = {}>({
  kbnClient,
  log,
  scoutSpace,
}: {
  kbnClient: KbnClient;
  log: ScoutLogger;
  scoutSpace?: ScoutSpaceParallelFixture;
}): StreamsApiService<T> => {
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
      condition: WithDefault<T, 'condition', unknown>,
      status: WithDefault<T, 'routingStatus', string> = 'enabled' as any
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
        return response.data as WithDefault<T, 'streamDefinition', unknown>;
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
    updateStream: async (
      streamName: string,
      updateBody: {
        ingest: WithDefault<T, 'ingestUpsertRequest', unknown>;
      }
    ) => {
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
        const stream = (definition as any).stream;
        if (stream?.ingest && 'wired' in stream.ingest) {
          await Promise.all(
            stream.ingest.wired.routing.map((child: any) => service.deleteStream(child.destination))
          );
        }
      });
    },
    clearStreamMappings: async (streamName: string) => {
      await measurePerformanceAsync(log, 'streamsApi.clearStreamMappings', async () => {
        const definition = await service.getStreamDefinition(streamName);
        const stream = (definition as any).stream;
        if (stream?.ingest && 'wired' in stream.ingest) {
          await service.updateStream(streamName, {
            ingest: {
              ...stream.ingest,
              processing: omit(stream.ingest.processing, 'updated_at'),
              wired: {
                ...stream.ingest.wired,
                fields: {},
              },
            } as WithDefault<T, 'ingestUpsertRequest', unknown>,
          });
        } else if (stream?.ingest && 'classic' in stream.ingest) {
          await service.updateStream(streamName, {
            ingest: {
              ...stream.ingest,
              processing: omit(stream.ingest.processing, 'updated_at'),
              classic: {
                ...stream.ingest.classic,
                field_overrides: {},
              },
            } as WithDefault<T, 'ingestUpsertRequest', unknown>,
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
        const stream = (definition as any).stream;
        await service.updateStream(streamName, {
          ingest: {
            ...stream.ingest,
            processing: {
              steps: [],
            },
          } as T['ingestUpsertRequest'] extends undefined ? unknown : T['ingestUpsertRequest'],
        });
      });
    },
    updateStreamProcessors: async (
      streamName: string,
      getProcessors:
        | WithDefault<T, 'streamlangDSL', unknown>
        | ((
            prevProcessors: WithDefault<T, 'streamlangDSL', unknown>
          ) => WithDefault<T, 'streamlangDSL', unknown>)
    ) => {
      await measurePerformanceAsync(log, 'streamsApi.updateStreamProcessors', async () => {
        const definition = await service.getStreamDefinition(streamName);
        const stream = (definition as any).stream;
        const isFunction = typeof getProcessors === 'function';
        const processing = isFunction
          ? (
              getProcessors as (
                prevProcessors: WithDefault<T, 'streamlangDSL', unknown>
              ) => WithDefault<T, 'streamlangDSL', unknown>
            )(stream.ingest.processing as unknown as WithDefault<T, 'streamlangDSL', unknown>)
          : (getProcessors as WithDefault<T, 'streamlangDSL', unknown>);
        await service.updateStream(streamName, {
          ingest: {
            ...stream.ingest,
            processing: processing as any,
          } as T['ingestUpsertRequest'] extends undefined ? unknown : T['ingestUpsertRequest'],
        });
      });
    },
  };

  return service;
};
