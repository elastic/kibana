/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License v 1".
 */

import type { Logger } from '@kbn/logging';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { errors as EsErrors } from '@elastic/elasticsearch';
import { initialize } from '.';
import type { DataStreamDefinition } from '../types';
import { mappings, type MappingsDefinition } from '@kbn/es-mappings';

describe('initialize - versioning logic', () => {
  let logger: Logger;
  let elasticsearchClient: jest.Mocked<ElasticsearchClient>;

  const testMappings = {
    properties: {
      '@timestamp': mappings.date(),
      mappedField: mappings.keyword(),
    },
  } satisfies MappingsDefinition;

  const createTestDataStream = (version: number): DataStreamDefinition<typeof testMappings> => ({
    name: 'test-data-stream',
    version,
    template: {
      mappings: testMappings,
    },
  });

  beforeEach(() => {
    logger = loggingSystemMock.createLogger();
    elasticsearchClient = elasticsearchClientMock.createInternalClient();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when version is incremented', () => {
    it('should update index template with new version and previous versions', async () => {
      const initialDataStream = createTestDataStream(1);
      const updatedDataStream = createTestDataStream(2);

      // Mock: Initial state - no index template exists
      (elasticsearchClient.indices.getIndexTemplate as jest.Mock).mockImplementationOnce(() =>
        Promise.reject(
          new EsErrors.ResponseError({
            statusCode: 404,
            body: { error: { type: 'resource_not_found_exception' } },
            warnings: [],
            headers: {},
            meta: {} as any,
          })
        )
      );

      // Mock: Initial state - no data stream exists
      (elasticsearchClient.indices.getDataStream as jest.Mock).mockImplementationOnce(() =>
        Promise.reject(
          new EsErrors.ResponseError({
            statusCode: 404,
            body: { error: { type: 'resource_not_found_exception' } },
            warnings: [],
            headers: {},
            meta: {} as any,
          })
        )
      );

      // Mock: putIndexTemplate for initial creation
      (elasticsearchClient.indices.putIndexTemplate as jest.Mock).mockImplementationOnce(() =>
        Promise.resolve({ acknowledged: true })
      );

      // Mock: createDataStream for initial creation
      (elasticsearchClient.indices.createDataStream as jest.Mock).mockImplementationOnce(() =>
        Promise.resolve({ acknowledged: true })
      );

      // First initialization - version 1
      await initialize({
        logger,
        elasticsearchClient,
        dataStream: initialDataStream,
        lazyCreation: false,
      });

      // Mock: Index template exists with version 1
      (elasticsearchClient.indices.getIndexTemplate as jest.Mock).mockImplementationOnce(() =>
        Promise.resolve({
          index_templates: [
            {
              name: initialDataStream.name,
              index_template: {
                index_patterns: [`${initialDataStream.name}*`],
                _meta: {
                  version: 1,
                  previousVersions: [],
                  userAgent: '@kbn/data-streams',
                  managed: true,
                },
              },
            },
          ],
        })
      );

      // Mock: Data stream exists
      (elasticsearchClient.indices.getDataStream as jest.Mock).mockImplementationOnce(() =>
        Promise.resolve({
          data_streams: [
            {
              name: initialDataStream.name,
              indices: [
                {
                  index_name: '.ds-test-data-stream-000001',
                  index_uuid: 'test-uuid',
                },
              ],
            },
          ],
        })
      );

      // Mock: simulateIndexTemplate for mapping application
      (elasticsearchClient.indices.simulateIndexTemplate as jest.Mock).mockImplementationOnce(() =>
        Promise.resolve({
          template: {
            mappings: updatedDataStream.template.mappings,
          },
        })
      );

      // Mock: putMapping for write index
      (elasticsearchClient.indices.putMapping as jest.Mock).mockImplementationOnce(() =>
        Promise.resolve({ acknowledged: true })
      );

      // Mock: putIndexTemplate for version update
      (elasticsearchClient.indices.putIndexTemplate as jest.Mock).mockImplementationOnce(() =>
        Promise.resolve({ acknowledged: true })
      );

      // Second initialization - version 2 (incremented)
      await initialize({
        logger,
        elasticsearchClient,
        dataStream: updatedDataStream,
        lazyCreation: false,
      });

      // Verify index template was updated with new version
      expect(elasticsearchClient.indices.putIndexTemplate).toHaveBeenCalledTimes(2);
      const updateCall = (elasticsearchClient.indices.putIndexTemplate as jest.Mock).mock
        .calls[1][0];
      expect(updateCall?._meta?.version).toBe(2);
      expect(updateCall?._meta?.previousVersions).toEqual([1]);

      // Verify mappings were applied to write index
      expect(elasticsearchClient.indices.simulateIndexTemplate).toHaveBeenCalledTimes(1);
      expect(elasticsearchClient.indices.putMapping).toHaveBeenCalledTimes(1);
      expect(elasticsearchClient.indices.putMapping).toHaveBeenCalledWith(
        expect.objectContaining({
          index: '.ds-test-data-stream-000001',
        })
      );
    });

    it('should apply mappings to write index when version is incremented', async () => {
      const initialDataStream = createTestDataStream(1);
      const updatedDataStream = createTestDataStream(2);

      const newMappings = {
        properties: {
          ...testMappings.properties,
          newField: mappings.text(),
        },
      } satisfies MappingsDefinition;

      const updatedDataStreamWithNewMappings: DataStreamDefinition<typeof newMappings> = {
        ...updatedDataStream,
        template: {
          mappings: newMappings,
        },
      };

      // Mock: Index template exists with version 1
      (elasticsearchClient.indices.getIndexTemplate as jest.Mock).mockImplementationOnce(() =>
        Promise.resolve({
          index_templates: [
            {
              name: initialDataStream.name,
              index_template: {
                index_patterns: [`${initialDataStream.name}*`],
                _meta: {
                  version: 1,
                  previousVersions: [],
                  userAgent: '@kbn/data-streams',
                  managed: true,
                },
              },
            },
          ],
        })
      );

      // Mock: Data stream exists with write index
      (elasticsearchClient.indices.getDataStream as jest.Mock).mockImplementationOnce(() =>
        Promise.resolve({
          data_streams: [
            {
              name: initialDataStream.name,
              indices: [
                {
                  index_name: '.ds-test-data-stream-000001',
                  index_uuid: 'test-uuid',
                },
              ],
            },
          ],
        })
      );

      // Mock: simulateIndexTemplate returns new mappings
      (elasticsearchClient.indices.simulateIndexTemplate as jest.Mock).mockImplementationOnce(() =>
        Promise.resolve({
          template: {
            mappings: newMappings,
          },
        })
      );

      // Mock: putMapping for write index
      (elasticsearchClient.indices.putMapping as jest.Mock).mockImplementationOnce(() =>
        Promise.resolve({ acknowledged: true })
      );

      // Mock: putIndexTemplate for version update
      (elasticsearchClient.indices.putIndexTemplate as jest.Mock).mockImplementationOnce(() =>
        Promise.resolve({ acknowledged: true })
      );

      await initialize({
        logger,
        elasticsearchClient,
        dataStream: updatedDataStreamWithNewMappings,
        lazyCreation: false,
      });

      // Verify mappings were simulated and applied
      expect(elasticsearchClient.indices.simulateIndexTemplate).toHaveBeenCalledWith({
        name: initialDataStream.name,
      });
      expect(elasticsearchClient.indices.putMapping).toHaveBeenCalledWith(
        expect.objectContaining({
          index: '.ds-test-data-stream-000001',
          ...newMappings,
        })
      );
    });

    it('should accumulate previous versions when updating multiple times', async () => {
      const v1DataStream = createTestDataStream(1);
      const v3DataStream = createTestDataStream(3);

      // Mock: Index template exists with version 2 (after first update)
      (elasticsearchClient.indices.getIndexTemplate as jest.Mock).mockImplementationOnce(() =>
        Promise.resolve({
          index_templates: [
            {
              name: v1DataStream.name,
              index_template: {
                index_patterns: [`${v1DataStream.name}*`],
                _meta: {
                  version: 2,
                  previousVersions: [1],
                  userAgent: '@kbn/data-streams',
                  managed: true,
                },
              },
            },
          ],
        })
      );

      // Mock: Data stream exists
      (elasticsearchClient.indices.getDataStream as jest.Mock).mockImplementationOnce(() =>
        Promise.resolve({
          data_streams: [
            {
              name: v1DataStream.name,
              indices: [
                {
                  index_name: '.ds-test-data-stream-000001',
                  index_uuid: 'test-uuid',
                },
              ],
            },
          ],
        })
      );

      // Mock: simulateIndexTemplate
      (elasticsearchClient.indices.simulateIndexTemplate as jest.Mock).mockImplementationOnce(() =>
        Promise.resolve({
          template: {
            mappings: v3DataStream.template.mappings,
          },
        })
      );

      // Mock: putMapping
      (elasticsearchClient.indices.putMapping as jest.Mock).mockImplementationOnce(() =>
        Promise.resolve({ acknowledged: true })
      );

      // Mock: putIndexTemplate
      (elasticsearchClient.indices.putIndexTemplate as jest.Mock).mockImplementationOnce(() =>
        Promise.resolve({ acknowledged: true })
      );

      await initialize({
        logger,
        elasticsearchClient,
        dataStream: v3DataStream,
        lazyCreation: false,
      });

      // Verify previous versions include both 1 and 2
      const updateCall = (elasticsearchClient.indices.putIndexTemplate as jest.Mock).mock
        .calls[0][0];
      expect(updateCall?._meta?.version).toBe(3);
      expect(updateCall?._meta?.previousVersions).toEqual([2, 1]);
    });
  });

  describe('when version remains the same', () => {
    it('should not update index template when version is unchanged', async () => {
      const dataStream = createTestDataStream(1);

      // Mock: Index template exists with version 1
      (elasticsearchClient.indices.getIndexTemplate as jest.Mock).mockImplementationOnce(() =>
        Promise.resolve({
          index_templates: [
            {
              name: dataStream.name,
              index_template: {
                index_patterns: [`${dataStream.name}*`],
                _meta: {
                  version: 1,
                  previousVersions: [],
                  userAgent: '@kbn/data-streams',
                  managed: true,
                },
              },
            },
          ],
        })
      );

      // Mock: Data stream exists
      (elasticsearchClient.indices.getDataStream as jest.Mock).mockImplementationOnce(() =>
        Promise.resolve({
          data_streams: [
            {
              name: dataStream.name,
              indices: [
                {
                  index_name: '.ds-test-data-stream-000001',
                  index_uuid: 'test-uuid',
                },
              ],
            },
          ],
        })
      );

      await initialize({
        logger,
        elasticsearchClient,
        dataStream,
        lazyCreation: false,
      });

      // Verify index template was NOT updated
      expect(elasticsearchClient.indices.putIndexTemplate).not.toHaveBeenCalled();

      // Verify mappings were NOT applied to write index
      expect(elasticsearchClient.indices.simulateIndexTemplate).not.toHaveBeenCalled();
      expect(elasticsearchClient.indices.putMapping).not.toHaveBeenCalled();
    });

    it('should not update index template even if mappings change but version is same', async () => {
      const dataStream = createTestDataStream(1);

      const differentMappings = {
        properties: {
          '@timestamp': mappings.date(),
          differentField: mappings.text(),
        },
      } satisfies MappingsDefinition;

      const dataStreamWithDifferentMappings: DataStreamDefinition<typeof differentMappings> = {
        ...dataStream,
        template: {
          mappings: differentMappings,
        },
      };

      // Mock: Index template exists with version 1
      (elasticsearchClient.indices.getIndexTemplate as jest.Mock).mockImplementationOnce(() =>
        Promise.resolve({
          index_templates: [
            {
              name: dataStream.name,
              index_template: {
                index_patterns: [`${dataStream.name}*`],
                _meta: {
                  version: 1,
                  previousVersions: [],
                  userAgent: '@kbn/data-streams',
                  managed: true,
                },
              },
            },
          ],
        })
      );

      // Mock: Data stream exists
      (elasticsearchClient.indices.getDataStream as jest.Mock).mockImplementationOnce(() =>
        Promise.resolve({
          data_streams: [
            {
              name: dataStream.name,
              indices: [
                {
                  index_name: '.ds-test-data-stream-000001',
                  index_uuid: 'test-uuid',
                },
              ],
            },
          ],
        })
      );

      await initialize({
        logger,
        elasticsearchClient,
        dataStream: dataStreamWithDifferentMappings,
        lazyCreation: false,
      });

      // Verify index template was NOT updated (version is same)
      expect(elasticsearchClient.indices.putIndexTemplate).not.toHaveBeenCalled();

      // Verify mappings were NOT applied to write index (version is same)
      expect(elasticsearchClient.indices.simulateIndexTemplate).not.toHaveBeenCalled();
      expect(elasticsearchClient.indices.putMapping).not.toHaveBeenCalled();
    });

    it('should not update when deployed version is greater than requested version', async () => {
      const dataStream = createTestDataStream(1);

      // Mock: Index template exists with version 2 (greater than requested version 1)
      (elasticsearchClient.indices.getIndexTemplate as jest.Mock).mockImplementationOnce(() =>
        Promise.resolve({
          index_templates: [
            {
              name: dataStream.name,
              index_template: {
                index_patterns: [`${dataStream.name}*`],
                _meta: {
                  version: 2,
                  previousVersions: [1],
                  userAgent: '@kbn/data-streams',
                  managed: true,
                },
              },
            },
          ],
        })
      );

      // Mock: Data stream exists
      (elasticsearchClient.indices.getDataStream as jest.Mock).mockImplementationOnce(() =>
        Promise.resolve({
          data_streams: [
            {
              name: dataStream.name,
              indices: [
                {
                  index_name: '.ds-test-data-stream-000001',
                  index_uuid: 'test-uuid',
                },
              ],
            },
          ],
        })
      );

      await initialize({
        logger,
        elasticsearchClient,
        dataStream,
        lazyCreation: false,
      });

      // Verify index template was NOT updated (deployed version is greater)
      expect(elasticsearchClient.indices.putIndexTemplate).not.toHaveBeenCalled();

      // Verify mappings were NOT applied (deployed version is greater)
      expect(elasticsearchClient.indices.simulateIndexTemplate).not.toHaveBeenCalled();
      expect(elasticsearchClient.indices.putMapping).not.toHaveBeenCalled();
    });
  });

  describe('initial creation', () => {
    it('should create index template and data stream on first initialization', async () => {
      const dataStream = createTestDataStream(1);

      // Mock: No index template exists
      (elasticsearchClient.indices.getIndexTemplate as jest.Mock).mockImplementationOnce(() =>
        Promise.reject(
          new EsErrors.ResponseError({
            statusCode: 404,
            body: { error: { type: 'resource_not_found_exception' } },
            warnings: [],
            headers: {},
            meta: {} as any,
          })
        )
      );

      // Mock: No data stream exists
      (elasticsearchClient.indices.getDataStream as jest.Mock).mockImplementationOnce(() =>
        Promise.reject(
          new EsErrors.ResponseError({
            statusCode: 404,
            body: { error: { type: 'resource_not_found_exception' } },
            warnings: [],
            headers: {},
            meta: {} as any,
          })
        )
      );

      // Mock: putIndexTemplate for creation
      (elasticsearchClient.indices.putIndexTemplate as jest.Mock).mockImplementationOnce(() =>
        Promise.resolve({ acknowledged: true })
      );

      // Mock: createDataStream for creation
      (elasticsearchClient.indices.createDataStream as jest.Mock).mockImplementationOnce(() =>
        Promise.resolve({ acknowledged: true })
      );

      await initialize({
        logger,
        elasticsearchClient,
        dataStream,
        lazyCreation: false,
      });

      // Verify index template was created
      expect(elasticsearchClient.indices.putIndexTemplate).toHaveBeenCalledTimes(1);
      const createCall = (elasticsearchClient.indices.putIndexTemplate as jest.Mock).mock
        .calls[0][0];
      expect(createCall?._meta?.version).toBe(1);
      expect(createCall?._meta?.previousVersions).toEqual([]);

      // Verify data stream was created
      expect(elasticsearchClient.indices.createDataStream).toHaveBeenCalledTimes(1);
      expect(elasticsearchClient.indices.createDataStream).toHaveBeenCalledWith({
        name: dataStream.name,
      });
    });
  });
});
