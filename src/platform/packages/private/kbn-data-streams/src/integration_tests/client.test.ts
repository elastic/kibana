/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Logger } from '@kbn/logging';
import { DataStreamClient } from '../client';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { TestElasticsearchUtils, createTestServers } from '@kbn/core-test-helpers-kbn-server';
import { DataStreamDefinition } from '../types';
import { Client } from '@elastic/elasticsearch';
import * as mappings from '../mappings';

describe('DataStreamClient', () => {
  let esServer: TestElasticsearchUtils;
  let logger: Logger;
  interface MyTestDoc {
    '@timestamp': string;
    mappedField: string;
  }
  const testDataStream: DataStreamDefinition<MyTestDoc> = {
    name: 'test-data-stream',
    mappings: {
      properties: {
        '@timestamp': mappings.date(),
        mappedField: mappings.keyword(),
      },
    },
  };

  const cleanup = async () => {
    const client: Client = esServer.es.getClient();
    await client.indices.deleteDataStream({ name: testDataStream.name }).catch(() => {});
    await client.indices.deleteIndexTemplate({ name: testDataStream.name }).catch(() => {});
  };

  beforeAll(async () => {
    const { startES } = createTestServers({
      adjustTimeout: jest.setTimeout,
    });
    esServer = await startES();
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
      const elasticsearchClient: Client = esServer.es.getClient();
      client = await DataStreamClient.setup({
        logger,
        elasticsearchClient,
        dataStreams: testDataStream,
      });
    });

    it('basic index and search', async () => {
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

  describe('setup', () => {
    async function assertStateOfIndexTemplate() {
      const esClient: Client = esServer.es.getClient();
      const {
        index_templates: [indexTemplate],
      } = await esClient.indices.getIndexTemplate({
        name: testDataStream.name,
      });

      expect(indexTemplate.index_template.index_patterns).toEqual([`${testDataStream.name}*`]);
      expect(indexTemplate.index_template._meta).toEqual({
        previousVersions: [],
        userAgent: '@kbn/data-streams',
        version: 'a13f161660c3a282f79f86a1d7429fce206dc249',
      });
      expect(indexTemplate.index_template.data_stream).toEqual({
        allow_custom_routing: false,
        hidden: true,
      });
      expect(indexTemplate.index_template.template).toEqual({
        mappings: {
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

    it('sets up a data stream as expected', async () => {
      const elasticsearchClient: Client = esServer.es.getClient();
      expect(
        await elasticsearchClient.indices.existsIndexTemplate({ name: testDataStream.name })
      ).toBe(false);
      expect(await elasticsearchClient.indices.exists({ index: testDataStream.name })).toBe(false);

      const client = await DataStreamClient.setup({
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
      const elasticsearchClient: Client = esServer.es.getClient();
      const ps: Promise<DataStreamClient<any, any>>[] = [];
      for (const _ of [1, 2, 3])
        ps.push(
          DataStreamClient.setup({
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

    it('updates mappings as expected', async () => {
      const elasticsearchClient: Client = esServer.es.getClient();
      await DataStreamClient.setup({
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
        ...testDataStream.mappings,
      });

      const nextDefinition: DataStreamDefinition<MyTestDoc & { newField: string }> = {
        ...testDataStream,
        mappings: {
          ...testDataStream.mappings,
          properties: {
            ...testDataStream.mappings!.properties,
            newField: mappings.text(),
          },
        },
      };

      await DataStreamClient.setup({
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
        previousVersions: ['c8d3eb967ceefa51957228606494ed36c62455d0'],
        userAgent: '@kbn/data-streams',
        version: '31fad584a7a542d96f14a8868b42076e318e89f5',
      });

      expect(indexTemplate.index_template.template).toEqual({
        mappings: nextDefinition.mappings,
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
        ...nextDefinition.mappings,
      });
    });
  });
});
