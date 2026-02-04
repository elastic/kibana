/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/logging';
import type { Client } from '@elastic/elasticsearch';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { ToolingLog } from '@kbn/tooling-log';
import type { EsTestCluster } from '@kbn/test';
import { createTestEsCluster } from '@kbn/test';
import { mappings, type MappingsDefinition } from '@kbn/es-mappings';
import { DataStreamClient } from '../client';
import type { DataStreamDefinition } from '../types';

describe('DataStreamClient', () => {
  let esServer: EsTestCluster;
  let logger: Logger;

  const myTestDocMappings: MappingsDefinition = {
    properties: {
      '@timestamp': mappings.date(),
      mappedField: mappings.keyword(),
    },
  };

  const testDataStream: DataStreamDefinition<MappingsDefinition> = {
    name: 'test-data-stream',
    version: 1,
    template: {
      mappings: myTestDocMappings,
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
    let client: DataStreamClient<MappingsDefinition>;
    beforeEach(async () => {
      const elasticsearchClient = esServer.getClient();
      const initializedClient = await DataStreamClient.initialize({
        logger,
        elasticsearchClient,
        dataStream: testDataStream,
      });
      if (!initializedClient) {
        throw new Error('Failed to initialize DataStreamClient');
      }
      client = initializedClient;
    });

    test('basic index and search', async () => {
      const response = await client.index({
        document: {
          '@timestamp': new Date().toISOString(),
          mappedField: 'test-value',
        },
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

    test('basic index and search, id provided', async () => {
      const response = await client.index({
        id: 'user-provided-id',
        document: {
          '@timestamp': new Date().toISOString(),
          mappedField: 'test-value',
        },
        refresh: true,
      });
      expect(response).toHaveProperty('result', 'created');

      const searchResponse = await client.search({
        query: {
          match_all: {},
        },
      });

      expect(searchResponse.hits.hits.length).toBe(1);
      expect(searchResponse.hits.hits[0]._id).toEqual('user-provided-id');
      expect(searchResponse.hits.hits[0]._source).toEqual({
        '@timestamp': expect.any(String),
        mappedField: 'test-value',
      });
    });

    // TODO: Add more thorough tests, for ex. for search runtime mappings
  });

  describe('space-aware operations', () => {
    let client: DataStreamClient<MappingsDefinition>;
    let esClient: Client;

    beforeEach(async () => {
      esClient = esServer.getClient();
      const initializedClient = await DataStreamClient.initialize({
        logger,
        elasticsearchClient: esClient,
        dataStream: testDataStream,
      });
      if (!initializedClient) {
        throw new Error('Failed to initialize DataStreamClient');
      }
      client = initializedClient;
    });

    describe('operations with space parameter', () => {
      it('should index with space and auto-generated ID, prefixing the ID and decorating the document', async () => {
        const response = await client.index({
          space: 'test-space',
          document: { '@timestamp': new Date().toISOString(), mappedField: 'test-value' },
          refresh: true,
        });

        expect(response).toHaveProperty('result', 'created');
        expect(response._id).toMatch(/^test-space::/);

        // Get document and verify kibana.space_ids is stripped from _source
        const getResponse = await client.get({ id: response._id!, space: 'test-space' });
        expect(getResponse._source).toEqual({
          '@timestamp': expect.any(String),
          mappedField: 'test-value',
        });
        expect(getResponse._source).not.toHaveProperty('kibana');

        // Verify the property is actually stored in ES (bypassing client)
        const rawDocSearch = await esClient.search<
          MappingsDefinition & { kibana: { space_ids: string[] } }
        >({
          index: testDataStream.name,
          query: { ids: { values: [response._id!] } },
          size: 1,
        });
        const rawDoc = rawDocSearch.hits.hits[0];
        expect(rawDoc).toBeDefined();
        expect(rawDoc._source?.kibana).toEqual({ space_ids: ['test-space'] });
      });

      it('should index with space and explicit ID, prefixing the ID correctly', async () => {
        const response = await client.index({
          space: 'test-space',
          id: 'my-doc',
          document: { '@timestamp': new Date().toISOString(), mappedField: 'test-value' },
          refresh: true,
        });

        expect(response._id).toBe('test-space::my-doc');

        // Get by prefixed ID
        const getResponse = await client.get({ id: 'test-space::my-doc', space: 'test-space' });
        expect(getResponse._source).toEqual({
          '@timestamp': expect.any(String),
          mappedField: 'test-value',
        });
        expect(getResponse._source).not.toHaveProperty('kibana');
      });

      it('should search within a space and return only documents from that space', async () => {
        // Index 2 documents in space-a
        await client.index({
          space: 'space-a',
          document: { '@timestamp': new Date().toISOString(), mappedField: 'doc-a-1' },
          refresh: true,
        });
        await client.index({
          space: 'space-a',
          document: { '@timestamp': new Date().toISOString(), mappedField: 'doc-a-2' },
          refresh: true,
        });

        // Index 1 document in space-b
        await client.index({
          space: 'space-b',
          document: { '@timestamp': new Date().toISOString(), mappedField: 'doc-b-1' },
          refresh: true,
        });

        // Search space-a should return 2 documents
        const searchResponseA = await client.search({
          space: 'space-a',
          query: { match_all: {} },
        });
        expect(searchResponseA.hits.hits.length).toBe(2);
        expect(
          searchResponseA.hits.hits.every((hit) =>
            (hit._source as any)?.mappedField?.startsWith('doc-a')
          )
        ).toBe(true);
        expect(
          searchResponseA.hits.hits.every((hit) => !hit._source || !('kibana' in hit._source))
        ).toBe(true);

        // Search space-b should return 1 document
        const searchResponseB = await client.search({
          space: 'space-b',
          query: { match_all: {} },
        });
        expect(searchResponseB.hits.hits.length).toBe(1);
        expect((searchResponseB.hits.hits[0]._source as any)?.mappedField).toBe('doc-b-1');
      });

      it('should ensure space isolation in searches', async () => {
        await client.index({
          space: 'space-a',
          document: { '@timestamp': new Date().toISOString(), mappedField: 'space-a-doc' },
          refresh: true,
        });
        await client.index({
          space: 'space-b',
          document: { '@timestamp': new Date().toISOString(), mappedField: 'space-b-doc' },
          refresh: true,
        });

        // Search space-a should NOT return space-b docs
        const searchA = await client.search({
          space: 'space-a',
          query: { match_all: {} },
        });
        expect(searchA.hits.hits.length).toBe(1);
        expect((searchA.hits.hits[0]._source as any)?.mappedField).toBe('space-a-doc');

        // Search space-b should NOT return space-a docs
        const searchB = await client.search({
          space: 'space-b',
          query: { match_all: {} },
        });
        expect(searchB.hits.hits.length).toBe(1);
        expect((searchB.hits.hits[0]._source as any)?.mappedField).toBe('space-b-doc');
      });

      it('should handle bulk operations with space, prefixing all IDs and decorating documents', async () => {
        const bulkResponse = await client.bulk({
          space: 'test-space',
          operations: [
            { create: {} },
            { '@timestamp': new Date().toISOString(), mappedField: 'bulk-doc-1' },
            { create: { _id: 'bulk-doc-2' } },
            { '@timestamp': new Date().toISOString(), mappedField: 'bulk-doc-2' },
            { create: { _id: 'bulk-doc-3' } },
            { '@timestamp': new Date().toISOString(), mappedField: 'bulk-doc-3' },
          ],
          refresh: true,
        });

        expect(bulkResponse.items.length).toBe(3);
        expect(bulkResponse.items[0].create?._id).toMatch(/^test-space::/);
        expect(bulkResponse.items[1].create?._id).toBe('test-space::bulk-doc-2');
        expect(bulkResponse.items[2].create?._id).toBe('test-space::bulk-doc-3');

        // Verify all documents are searchable in the space
        const searchResponse = await client.search({
          space: 'test-space',
          query: { match_all: {} },
        });
        expect(searchResponse.hits.hits.length).toBe(3);

        // Verify documents have kibana.space_ids in ES
        const rawDocs = await esClient.mget({
          docs: [
            { _id: bulkResponse.items[0].create?._id!, _index: testDataStream.name },
            { _id: bulkResponse.items[1].create?._id!, _index: testDataStream.name },
            { _id: bulkResponse.items[2].create?._id!, _index: testDataStream.name },
          ],
        });
        rawDocs.docs.forEach((doc) => {
          if ('found' in doc && doc.found && '_source' in doc) {
            expect(doc._source).toHaveProperty('kibana');
            expect((doc._source as any).kibana).toEqual({ space_ids: ['test-space'] });
          }
        });
      });

      it('should throw error when getting document with wrong space', async () => {
        const response = await client.index({
          space: 'space-a',
          document: { '@timestamp': new Date().toISOString(), mappedField: 'test' },
          refresh: true,
        });

        // Try to get with wrong space
        await expect(client.get({ id: response._id!, space: 'space-b' })).rejects.toThrow(
          "Space mismatch: document belongs to 'space-a', not 'space-b'"
        );
      });

      it('should reject create operation with existing ID (data streams do not support updates)', async () => {
        await client.index({
          space: 'space-a',
          id: 'update-test',
          document: { '@timestamp': new Date().toISOString(), mappedField: 'original' },
          refresh: true,
        });

        // Data streams only support create operations, so attempting to create with an existing ID should fail
        const bulkResponse = await client.bulk({
          space: 'space-a',
          operations: [
            { create: { _id: 'update-test' } },
            { '@timestamp': new Date().toISOString(), mappedField: 'updated' },
          ],
          refresh: true,
        });

        // The create operation should have failed
        expect(bulkResponse.items[0].create?.error).toBeDefined();
        expect(bulkResponse.items[0].create?.error?.type).toBe('version_conflict_engine_exception');
      });
    });

    describe('operations without space parameter', () => {
      it('should index without space, not prefixing ID and not decorating document', async () => {
        const response = await client.index({
          document: { '@timestamp': new Date().toISOString(), mappedField: 'test-value' },
          refresh: true,
        });

        expect(response).toHaveProperty('result', 'created');
        // ID should NOT contain ::
        expect(response._id).not.toContain('::');

        // Get document and verify kibana.space_ids is NOT present
        const getResponse = await client.get({ id: response._id! });
        expect(getResponse._source).toEqual({
          '@timestamp': expect.any(String),
          mappedField: 'test-value',
        });
        expect(getResponse._source).not.toHaveProperty('kibana');

        // Verify the property is NOT stored in ES
        const rawDocSearch = await esClient.search({
          index: testDataStream.name,
          query: { ids: { values: [response._id!] } },
          size: 1,
        });
        const rawDoc = rawDocSearch.hits.hits[0];
        expect(rawDoc).toBeDefined();
        expect(rawDoc._source).not.toHaveProperty('kibana');
      });

      it('should search without space and exclude space-bound documents', async () => {
        // Index 2 docs without space (space-agnostic)
        const agnostic1 = await client.index({
          document: { '@timestamp': new Date().toISOString(), mappedField: 'agnostic-1' },
          refresh: true,
        });
        const agnostic2 = await client.index({
          document: { '@timestamp': new Date().toISOString(), mappedField: 'agnostic-2' },
          refresh: true,
        });

        // Index 2 docs with space
        await client.index({
          space: 'test-space',
          document: { '@timestamp': new Date().toISOString(), mappedField: 'space-bound-1' },
          refresh: true,
        });
        await client.index({
          space: 'test-space',
          document: { '@timestamp': new Date().toISOString(), mappedField: 'space-bound-2' },
          refresh: true,
        });

        // Search without space should return only 2 space-agnostic docs
        const searchResponse = await client.search({
          query: { match_all: {} },
        });
        expect(searchResponse.hits.hits.length).toBe(2);
        const returnedIds = searchResponse.hits.hits.map((hit) => hit._id).sort();
        expect(returnedIds).toEqual([agnostic1._id, agnostic2._id].sort());
      });

      it('should throw error when indexing with space-prefixed ID without space parameter', async () => {
        await expect(
          client.index({
            id: 'space::doc',
            document: { '@timestamp': new Date().toISOString(), mappedField: 'test' },
          })
        ).rejects.toThrow("IDs cannot contain '::'");
      });

      it('should throw error when getting with space-prefixed ID without space parameter', async () => {
        await expect(client.get({ id: 'space::doc' })).rejects.toThrow("IDs cannot contain '::'");
      });

      it('should handle bulk operations without space, not prefixing IDs', async () => {
        const bulkResponse = await client.bulk({
          operations: [
            { create: {} },
            { '@timestamp': new Date().toISOString(), mappedField: 'bulk-agnostic-1' },
            { create: { _id: 'bulk-agnostic-2' } },
            { '@timestamp': new Date().toISOString(), mappedField: 'bulk-agnostic-2' },
          ],
          refresh: true,
        });

        expect(bulkResponse.items.length).toBe(2);
        expect(bulkResponse.items[0].create?._id).not.toContain('::');
        expect(bulkResponse.items[1].create?._id).toBe('bulk-agnostic-2');

        // Verify documents don't have kibana.space_ids
        const rawDocs = await esClient.mget({
          docs: [
            { _id: bulkResponse.items[0].create?._id!, _index: testDataStream.name },
            { _id: bulkResponse.items[1].create?._id!, _index: testDataStream.name },
          ],
        });
        rawDocs.docs.forEach((doc) => {
          if ('found' in doc && doc.found && '_source' in doc) {
            expect(doc._source).not.toHaveProperty('kibana');
          }
        });
      });
    });

    describe('edge cases', () => {
      it('should handle multiple spaces isolation correctly', async () => {
        const spaces = ['space-1', 'space-2', 'space-3'];
        const docsPerSpace: Record<string, string[]> = {};

        // Index documents in each space
        for (const space of spaces) {
          const docs: string[] = [];
          for (let i = 0; i < 3; i++) {
            const response = await client.index({
              space,
              document: {
                '@timestamp': new Date().toISOString(),
                mappedField: `${space}-doc-${i}`,
              },
              refresh: true,
            });
            docs.push(response._id!);
          }
          docsPerSpace[space] = docs;
        }

        // Verify each space search returns only its own documents
        for (const space of spaces) {
          const searchResponse = await client.search({
            space,
            query: { match_all: {} },
          });
          expect(searchResponse.hits.hits.length).toBe(3);
          const returnedIds = searchResponse.hits.hits.map((hit) => hit._id).sort();
          expect(returnedIds).toEqual(docsPerSpace[space].sort());
        }
      });

      it('should reject IDs containing :: separator in space-aware mode', async () => {
        // IDs containing :: separator should be rejected regardless of space parameter
        await expect(
          client.index({
            space: 'my-space',
            id: 'doc::with::colons',
            document: { '@timestamp': new Date().toISOString(), mappedField: 'test' },
            refresh: true,
          })
        ).rejects.toThrow("IDs cannot contain '::'");
      });

      it('should reject IDs containing :: separator in space-agnostic mode', async () => {
        // IDs containing :: separator should be rejected regardless of space parameter
        await expect(
          client.index({
            id: 'doc::with::colons',
            document: { '@timestamp': new Date().toISOString(), mappedField: 'test' },
            refresh: true,
          })
        ).rejects.toThrow("IDs cannot contain '::'");
      });

      it('should preserve space binding for documents (data streams do not support updates)', async () => {
        const createResponse = await client.index({
          space: 'persistent-space',
          id: 'persistent-doc',
          document: { '@timestamp': new Date().toISOString(), mappedField: 'original' },
          refresh: true,
        });

        // Verify it belongs to persistent-space
        const getResponse = await client.get({
          id: createResponse._id!,
          space: 'persistent-space',
        });
        expect((getResponse._source as any)?.mappedField).toBe('original');

        // Verify it's searchable only in persistent-space
        const searchResponse = await client.search({
          space: 'persistent-space',
          query: { term: { mappedField: 'original' } },
        });
        expect(searchResponse.hits.hits.length).toBe(1);

        // Verify it's NOT searchable in other spaces
        const otherSpaceSearch = await client.search({
          space: 'other-space',
          query: { term: { mappedField: 'original' } },
        });
        expect(otherSpaceSearch.hits.hits.length).toBe(0);
      });

      it('should handle mixed space and space-agnostic documents correctly', async () => {
        // Create space-agnostic doc
        const agnosticResponse = await client.index({
          document: { '@timestamp': new Date().toISOString(), mappedField: 'agnostic' },
          refresh: true,
        });

        // Create space-bound doc
        await client.index({
          space: 'mixed-space',
          document: { '@timestamp': new Date().toISOString(), mappedField: 'space-bound' },
          refresh: true,
        });

        // Search without space should return only agnostic doc
        const agnosticSearch = await client.search({
          query: { match_all: {} },
        });
        expect(agnosticSearch.hits.hits.length).toBe(1);
        expect(agnosticSearch.hits.hits[0]._id).toBe(agnosticResponse._id);

        // Search with space should return only space-bound doc
        const spaceSearch = await client.search({
          space: 'mixed-space',
          query: { match_all: {} },
        });
        expect(spaceSearch.hits.hits.length).toBe(1);
        expect((spaceSearch.hits.hits[0]._source as any)?.mappedField).toBe('space-bound');
      });
    });
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
            kibana: {
              properties: {
                space_ids: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
              },
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
          dataStream: { ...testDataStream, version: 0 },
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
        dataStream: testDataStream,
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
      const ps: Promise<DataStreamClient<any, any> | undefined>[] = [];
      for (const _ of [1, 2, 3])
        ps.push(
          DataStreamClient.initialize({
            logger,
            elasticsearchClient,
            dataStream: testDataStream,
          })
        );

      const clients = (await Promise.all(ps)).filter(
        (c): c is DataStreamClient<any, any> => c !== undefined
      );

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
        dataStream: testDataStream,
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
        properties: {
          ...testDataStream.template.mappings?.properties,
          kibana: {
            properties: {
              space_ids: {
                type: 'keyword',
                ignore_above: 1024,
              },
            },
          },
        },
        dynamic: 'false',
      });

      const nextMappings = {
        ...myTestDocMappings,
        properties: {
          ...myTestDocMappings.properties,
          newField: mappings.text(),
        },
      } satisfies MappingsDefinition;

      const nextDefinition: DataStreamDefinition<typeof nextMappings> = {
        ...testDataStream,
        version: 2,
        template: {
          mappings: nextMappings,
        },
      };

      await DataStreamClient.initialize({
        logger,
        elasticsearchClient,
        dataStream: nextDefinition,
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
          properties: {
            ...nextDefinition.template.mappings?.properties,
            kibana: {
              properties: {
                space_ids: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
              },
            },
          },
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
        properties: {
          ...nextDefinition.template.mappings?.properties,
          kibana: {
            properties: {
              space_ids: {
                type: 'keyword',
                ignore_above: 1024,
              },
            },
          },
        },
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
        dataStream: testDataStream,
      });

      const sameVersionMappings = {
        properties: { somethingElse: mappings.text() },
      } satisfies MappingsDefinition;

      await DataStreamClient.initialize({
        logger,
        elasticsearchClient,
        dataStream: {
          ...testDataStream,
          version: 1, // same version as initial deployment
          template: {
            ...testDataStream.template,
            mappings: sameVersionMappings, // some new mappings
          },
        },
      });

      expect(getIndexTemplateSpy).toHaveBeenCalledTimes(2);
      expect(putIndexTemplateSpy).toHaveBeenCalledTimes(1); // Index template not updated when version is same
      expect(createDataStreamSpy).toHaveBeenCalledTimes(1);
      expect(putMappingSpy).toHaveBeenCalledTimes(0); // Mappings are not applied to write index when version is not incremented
    });
  });
});
