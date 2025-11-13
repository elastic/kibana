/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/logging';
import { DataStreamClient } from '../client';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { ToolingLog } from '@kbn/tooling-log';
import type { EsTestCluster } from '@kbn/test';
import { createTestEsCluster } from '@kbn/test';
import type { DataStreamDefinition } from '../types';
import { mappings } from '@kbn/es-mappings';

describe('DataStreamClient', () => {
  let esServer: EsTestCluster;
  let logger: Logger;
  interface MyTestDoc {
    '@timestamp': string;
    mappedField: string;
  }
  const testDataStream: DataStreamDefinition<MyTestDoc> = {
    name: 'test-data-stream',
    version: 1,
    template: {
      mappings: {
        properties: {
          '@timestamp': mappings.date(),
          mappedField: mappings.keyword(),
        },
      },
    },
  };

  const cleanup = async () => {
    const client = esServer.getClient();
    await client.indices.deleteDataStream({ name: testDataStream.name }).catch(() => {});
    await client.indices.deleteIndexTemplate({ name: testDataStream.name }).catch(() => {});
  };

  beforeAll(async () => {
    jest.setTimeout(30_000);
    esServer = createTestEsCluster({
      log: new ToolingLog({ writeTo: process.stdout, level: 'debug' }),
    });
    await esServer.start();
  });

  afterAll(async () => {
    await esServer.stop();
  });

  beforeEach(async () => {
    logger = loggingSystemMock.createLogger();
  });

  afterEach(async () => {
    await cleanup();
  });

  describe('operations', () => {
    let client: DataStreamClient<MyTestDoc, {}>;
    beforeEach(async () => {
      const elasticsearchClient = esServer.getClient();
      client = await DataStreamClient.initialize({
        logger,
        elasticsearchClient,
        dataStreams: testDataStream,
      });
    });

    test('basic index and search', async () => {
      const response = await client.index({
        document: { '@timestamp': new Date().toISOString(), mappedField: 'test-value' },
        refresh: true,
      });
      expect(response).toHaveProperty('result', 'created');

      const searchResponse = await client.search({
        query: {
          match_all: {},
        },
      });

      expect(searchResponse.hits.hits.length).toBe(1);
      expect(searchResponse.hits.hits[0]._source).toEqual({
        '@timestamp': expect.any(String),
        mappedField: 'test-value',
      });
    });

    // it('searches (basic)', async () => {});

    // TODO: Add more thorough tests, for ex. for search runtime mappings
  });

  describe('initialize', () => {
    async function assertStateOfIndexTemplate() {
      const esClient = esServer.getClient();
      const {
        index_templates: [indexTemplate],
      } = await esClient.indices.getIndexTemplate({
        name: testDataStream.name,
      });

      expect(indexTemplate.index_template.index_patterns).toEqual([`${testDataStream.name}*`]);
      expect(indexTemplate.index_template._meta).toEqual({
        previousVersions: [],
        userAgent: '@kbn/data-streams',
        version: 1,
        managed: true,
      });
      expect(indexTemplate.index_template.data_stream).toEqual({
        allow_custom_routing: false,
        hidden: true,
      });
      expect(indexTemplate.index_template.template).toEqual({
        mappings: {
          dynamic: false,
          properties: {
            '@timestamp': {
              type: 'date',
            },
            mappedField: {
              type: 'keyword',
              ignore_above: 1024,
            },
          },
        },
        settings: {
          index: {
            hidden: 'true',
          },
        },
      });
    }

    it('does not accept version numbers less than 1', async () => {
      await expect(
        DataStreamClient.initialize({
          logger,
          elasticsearchClient: esServer.getClient(),
          dataStreams: { ...testDataStream, version: 0 },
        })
      ).rejects.toThrow('Template version must be greater than 0');
    });

    it('sets up a data stream as expected', async () => {
      const elasticsearchClient = esServer.getClient();
      expect(
        await elasticsearchClient.indices.existsIndexTemplate({ name: testDataStream.name })
      ).toBe(false);
      expect(await elasticsearchClient.indices.exists({ index: testDataStream.name })).toBe(false);

      const client = await DataStreamClient.initialize({
        logger,
        elasticsearchClient,
        dataStreams: testDataStream,
      });

      expect(client).toBeInstanceOf(DataStreamClient);
      expect(
        await elasticsearchClient.indices.existsIndexTemplate({ name: testDataStream.name })
      ).toBe(true);
      expect(await elasticsearchClient.indices.exists({ index: testDataStream.name })).toBe(true);
      await assertStateOfIndexTemplate();
    });

    it('is idempotent', async () => {
      const elasticsearchClient = esServer.getClient();
      const ps: Promise<DataStreamClient<any, any>>[] = [];
      for (const _ of [1, 2, 3])
        ps.push(
          DataStreamClient.initialize({
            logger,
            elasticsearchClient,
            dataStreams: testDataStream,
          })
        );

      const clients = await Promise.all(ps);

      expect(clients).toEqual([
        expect.any(DataStreamClient),
        expect.any(DataStreamClient),
        expect.any(DataStreamClient),
      ]);
      await assertStateOfIndexTemplate();
    });

    test('updates mappings and settings as expected when a new version is deployed', async () => {
      const elasticsearchClient = esServer.getClient();
      await DataStreamClient.initialize({
        logger,
        elasticsearchClient,
        dataStreams: testDataStream,
      });

      await assertStateOfIndexTemplate();

      const {
        data_streams: [dataStream1],
      } = await elasticsearchClient.indices.getDataStream({
        name: testDataStream.name,
      });
      const writeIndex1 = dataStream1.indices[0];
      const mappings1 = await elasticsearchClient.indices.getMapping({
        index: writeIndex1.index_name,
      });
      expect(mappings1[writeIndex1.index_name].mappings).toEqual({
        _data_stream_timestamp: {
          enabled: true,
        },
        ...testDataStream.template.mappings,
        dynamic: 'false',
      });

      const nextDefinition: DataStreamDefinition<MyTestDoc & { newField: string }> = {
        ...testDataStream,
        version: 2,
        template: {
          mappings: {
            ...testDataStream.template.mappings,
            properties: {
              ...testDataStream.template.mappings!.properties,
              newField: mappings.text(),
            },
          },
        },
      };

      await DataStreamClient.initialize({
        logger,
        elasticsearchClient,
        dataStreams: nextDefinition,
      });

      const {
        index_templates: [indexTemplate],
      } = await elasticsearchClient.indices.getIndexTemplate({
        name: testDataStream.name,
      });

      expect(indexTemplate.index_template._meta).toEqual({
        previousVersions: [1],
        userAgent: '@kbn/data-streams',
        version: 2,
        managed: true,
      });

      expect(indexTemplate.index_template.template).toEqual({
        mappings: {
          ...nextDefinition.template.mappings,
          dynamic: false,
        },
        settings: {
          index: {
            hidden: 'true',
          },
        },
      });

      const {
        data_streams: [dataStream2],
      } = await elasticsearchClient.indices.getDataStream({
        name: testDataStream.name,
      });
      const writeIndex2 = dataStream2.indices[0];
      const mappings2 = await elasticsearchClient.indices.getMapping({
        index: writeIndex2.index_name,
      });
      expect(mappings2[writeIndex2.index_name].mappings).toEqual({
        _data_stream_timestamp: {
          enabled: true,
        },
        ...nextDefinition.template.mappings,
        dynamic: 'false',
      });
    });

    test('does not update if the version remains the same', async () => {
      const elasticsearchClient = esServer.getClient();

      const getIndexTemplateSpy = jest.spyOn(elasticsearchClient.indices, 'getIndexTemplate');
      const putIndexTemplateSpy = jest.spyOn(elasticsearchClient.indices, 'putIndexTemplate');
      const createDataStreamSpy = jest.spyOn(elasticsearchClient.indices, 'createDataStream');
      const putMappingSpy = jest.spyOn(elasticsearchClient.indices, 'putMapping');

      await DataStreamClient.initialize({
        logger,
        elasticsearchClient,
        dataStreams: testDataStream,
      });

      await DataStreamClient.initialize({
        logger,
        elasticsearchClient,
        dataStreams: {
          ...testDataStream,
          version: 1, // same version as initial deployment
          template: {
            ...testDataStream.template,
            mappings: { properties: { somethingElse: mappings.text() } as any }, // some new mappings
          },
        },
      });

      expect(getIndexTemplateSpy).toHaveBeenCalledTimes(2);
      expect(putIndexTemplateSpy).toHaveBeenCalledTimes(1);
      expect(createDataStreamSpy).toHaveBeenCalledTimes(1);
      expect(putMappingSpy).toHaveBeenCalledTimes(0); // No mapping updates were made
    });
  });
});
