/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';
import { mappings, type MappingsDefinition } from '@kbn/es-mappings';
import { initializeDataStream } from './data_stream';
import type { DataStreamDefinition } from '../types';

describe('initializeDataStream', () => {
  let logger: Logger;
  let elasticsearchClient: jest.Mocked<ElasticsearchClient>;

  const testMappings = {
    properties: {
      '@timestamp': mappings.date(),
      mappedField: mappings.keyword(),
    },
  } satisfies MappingsDefinition;

  beforeEach(() => {
    logger = loggingSystemMock.createLogger();
    elasticsearchClient = elasticsearchClientMock.createInternalClient();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('does not update lifecycle when only key ordering differs', async () => {
    const newLifecycle = {
      enabled: true,
      data_retention: '30d',
    } as const;
    const existingLifecycle = {
      data_retention: '30d',
      enabled: true,
    } as const;
    const dataStream: DataStreamDefinition<typeof testMappings> = {
      name: 'test-data-stream',
      version: 2,
      template: {
        mappings: testMappings,
        lifecycle: newLifecycle,
      },
    };

    (elasticsearchClient.indices.simulateIndexTemplate as jest.Mock).mockResolvedValue({
      template: {
        mappings: dataStream.template.mappings,
      },
    });

    (elasticsearchClient.indices.putMapping as jest.Mock).mockResolvedValue({
      acknowledged: true,
    });

    await initializeDataStream({
      logger,
      elasticsearchClient,
      dataStream,
      existingDataStream: {
        name: dataStream.name,
        indices: [
          {
            index_name: '.ds-test-data-stream-000001',
            index_uuid: 'test-uuid',
          },
        ],
      } as any,
      existingIndexTemplate: {
        index_template: {
          _meta: {
            version: 1,
          },
          template: {
            lifecycle: existingLifecycle,
          },
        },
      } as any,
      skipCreation: false,
    });

    expect(elasticsearchClient.indices.putMapping).toHaveBeenCalledTimes(1);
    expect(elasticsearchClient.indices.putDataLifecycle).not.toHaveBeenCalled();
    expect(elasticsearchClient.indices.deleteDataLifecycle).not.toHaveBeenCalled();
  });
});
