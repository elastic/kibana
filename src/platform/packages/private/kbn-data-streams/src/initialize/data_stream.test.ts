/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type * as api from '@elastic/elasticsearch/lib/api/types';
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

  describe('with the rollover mappings update strategy', () => {
    const dataStreamName = 'test-data-stream';
    const writeIndexName = '.ds-test-data-stream-000002';

    const createDataStream = (
      version: number,
      lifecycle?: { data_retention: string }
    ): DataStreamDefinition<typeof testMappings> => ({
      name: dataStreamName,
      version,
      mappingsUpdateStrategy: 'rollover',
      template: { mappings: testMappings, lifecycle },
    });

    const createExistingDataStream = ({ rolloverOnWrite = false } = {}): api.IndicesDataStream => ({
      name: dataStreamName,
      generation: 2,
      hidden: true,
      indices: [
        { index_name: '.ds-test-data-stream-000001', index_uuid: 'uuid-1' },
        { index_name: writeIndexName, index_uuid: 'uuid-2' },
      ],
      next_generation_managed_by: 'Data stream lifecycle',
      prefer_ilm: false,
      rollover_on_write: rolloverOnWrite,
      settings: {},
      status: 'green',
      template: dataStreamName,
      timestamp_field: { name: '@timestamp' },
    });

    const createExistingIndexTemplate = ({
      version,
      mappingsVersion,
      lifecycle,
    }: {
      version: number;
      mappingsVersion?: number;
      lifecycle?: { data_retention: string };
    }): api.IndicesGetIndexTemplateIndexTemplateItem => ({
      name: dataStreamName,
      index_template: {
        index_patterns: [`${dataStreamName}*`],
        composed_of: [],
        _meta: { version },
        template: {
          mappings: mappingsVersion === undefined ? {} : { _meta: { version: mappingsVersion } },
          lifecycle,
        },
      },
    });

    const mockWriteIndexMappingsVersion = (version: number | undefined) => {
      (elasticsearchClient.indices.getMapping as jest.Mock).mockResolvedValue({
        [writeIndexName]: { mappings: version === undefined ? {} : { _meta: { version } } },
      });
    };

    it('rolls over lazily instead of updating the write index mappings when the version is incremented', async () => {
      mockWriteIndexMappingsVersion(undefined);

      await initializeDataStream({
        logger,
        elasticsearchClient,
        dataStream: createDataStream(2),
        existingDataStream: createExistingDataStream(),
        existingIndexTemplate: createExistingIndexTemplate({ version: 1 }),
        skipCreation: false,
      });

      expect(elasticsearchClient.indices.simulateIndexTemplate).not.toHaveBeenCalled();
      expect(elasticsearchClient.indices.putMapping).not.toHaveBeenCalled();
      expect(elasticsearchClient.indices.getMapping).toHaveBeenCalledWith({
        index: writeIndexName,
      });
      expect(elasticsearchClient.indices.rollover).toHaveBeenCalledWith({
        alias: dataStreamName,
        lazy: true,
      });
    });

    it('rolls over when the index template is up to date but the write index mappings are older', async () => {
      // e.g. a previous start updated the index template but failed to roll over.
      mockWriteIndexMappingsVersion(1);

      await initializeDataStream({
        logger,
        elasticsearchClient,
        dataStream: createDataStream(2),
        existingDataStream: createExistingDataStream(),
        existingIndexTemplate: createExistingIndexTemplate({ version: 2, mappingsVersion: 2 }),
        skipCreation: false,
      });

      expect(elasticsearchClient.indices.rollover).toHaveBeenCalledWith({
        alias: dataStreamName,
        lazy: true,
      });
    });

    it('does not roll over when the write index mappings are up to date', async () => {
      mockWriteIndexMappingsVersion(2);

      await initializeDataStream({
        logger,
        elasticsearchClient,
        dataStream: createDataStream(2),
        existingDataStream: createExistingDataStream(),
        existingIndexTemplate: createExistingIndexTemplate({ version: 2, mappingsVersion: 2 }),
        skipCreation: false,
      });

      expect(elasticsearchClient.indices.rollover).not.toHaveBeenCalled();
      expect(elasticsearchClient.indices.putMapping).not.toHaveBeenCalled();
    });

    it('does not roll over when the index template mappings are not versioned', async () => {
      await initializeDataStream({
        logger,
        elasticsearchClient,
        dataStream: createDataStream(2),
        existingDataStream: createExistingDataStream(),
        existingIndexTemplate: createExistingIndexTemplate({ version: 2 }),
        skipCreation: false,
      });

      expect(elasticsearchClient.indices.getMapping).not.toHaveBeenCalled();
      expect(elasticsearchClient.indices.rollover).not.toHaveBeenCalled();
    });

    it('does not roll over when the data stream is already marked for rollover', async () => {
      await initializeDataStream({
        logger,
        elasticsearchClient,
        dataStream: createDataStream(2),
        existingDataStream: createExistingDataStream({ rolloverOnWrite: true }),
        existingIndexTemplate: createExistingIndexTemplate({ version: 1 }),
        skipCreation: false,
      });

      expect(elasticsearchClient.indices.getMapping).not.toHaveBeenCalled();
      expect(elasticsearchClient.indices.rollover).not.toHaveBeenCalled();
    });

    it('creates a missing data stream without rolling over', async () => {
      await initializeDataStream({
        logger,
        elasticsearchClient,
        dataStream: createDataStream(1),
        existingDataStream: undefined,
        existingIndexTemplate: undefined,
        skipCreation: false,
      });

      expect(elasticsearchClient.indices.createDataStream).toHaveBeenCalledWith({
        name: dataStreamName,
      });
      expect(elasticsearchClient.indices.rollover).not.toHaveBeenCalled();
    });

    it('updates the lifecycle when the version is incremented', async () => {
      mockWriteIndexMappingsVersion(1);

      await initializeDataStream({
        logger,
        elasticsearchClient,
        dataStream: createDataStream(2, { data_retention: '30d' }),
        existingDataStream: createExistingDataStream(),
        existingIndexTemplate: createExistingIndexTemplate({
          version: 1,
          mappingsVersion: 1,
          lifecycle: { data_retention: '7d' },
        }),
        skipCreation: false,
      });

      expect(elasticsearchClient.indices.putDataLifecycle).toHaveBeenCalledWith({
        name: dataStreamName,
        data_retention: '30d',
        enabled: true,
      });
      expect(elasticsearchClient.indices.rollover).toHaveBeenCalledTimes(1);
    });
  });
});
