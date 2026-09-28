/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/logging';

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { ToolingLog } from '@kbn/tooling-log';
import type { EsTestCluster } from '@kbn/test';
import { createTestEsCluster } from '@kbn/test';
import type { DataStreamDefinition } from '../types';
import type { GetFieldsOf } from '@kbn/es-mappings';
import { mappings, type MappingsDefinition } from '@kbn/es-mappings';
import { initialize } from '../initialize';
import { getExistingIndexTemplate } from '../initialize/exists_checks';
import { initializeIndexTemplate } from '../initialize/index_template';
import { DataStreamClient } from '../client';

describe('Data streams initialize function', () => {
  let esServer: EsTestCluster;
  let logger: Logger;

  interface MyTestDoc extends GetFieldsOf<typeof myTestDocMappings> {
    '@timestamp': string;
    mappedFieldOptional?: string;
    mappedFieldRequired: string;
    nestedField: {
      mappedFieldOptional?: string;
      mappedFieldRequired: string;
    };
    arrayField: string[];
    unmappedFieldRequired: string;
    unmappedFieldOptional?: string;
  }

  const myTestDocMappings = {
    properties: {
      '@timestamp': mappings.date(),
      mappedField: mappings.keyword(),
      nestedField: mappings.object({
        properties: {
          mappedFieldOptional: mappings.keyword(),
          mappedFieldRequired: mappings.keyword(),
        },
      }),
      arrayField: mappings.keyword(),
    },
  } satisfies MappingsDefinition;

  const testDataStream: DataStreamDefinition<typeof myTestDocMappings, MyTestDoc> = {
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
    await client.indices
      .deleteIndexTemplate({ name: `${testDataStream.name}-temp` })
      .catch(() => {});
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

  describe('full initialization (lazyCreation: false)', () => {
    it('should create the data stream and index template if it does not exist, and update it if it does', async () => {
      const esClient = esServer.getClient();

      // First initialization - should create both
      const result1 = await initialize({
        logger,
        elasticsearchClient: esClient,
        dataStream: testDataStream,
        lazyCreation: false,
      });

      expect(result1.dataStreamReady).toBe(true);

      const {
        data_streams: [dataStream],
      } = await esClient.indices.getDataStream({ name: testDataStream.name });
      expect(dataStream.name).toBe(testDataStream.name);
      expect(dataStream.timestamp_field).toEqual({ name: '@timestamp' });
      expect(dataStream.indices).toHaveLength(1);
      expect(dataStream.generation).toEqual(1);
      expect(dataStream._meta).toEqual({
        userAgent: '@kbn/data-streams',
        version: 1,
        managed: true,
        previousVersions: [],
      });
      expect(dataStream.hidden).toEqual(true);

      const {
        index_templates: [indexTemplate],
      } = await esClient.indices.getIndexTemplate({ name: testDataStream.name });
      expect(indexTemplate.name).toEqual(testDataStream.name);
      expect(indexTemplate.index_template._meta?.version).toEqual(1);

      // Second initialization - should not change generation (idempotent)
      const result2 = await initialize({
        logger,
        elasticsearchClient: esClient,
        dataStream: testDataStream,
        lazyCreation: false,
      });

      expect(result2.dataStreamReady).toBe(true);

      const {
        data_streams: [dataStreamUpdated],
      } = await esClient.indices.getDataStream({ name: testDataStream.name });
      expect(dataStreamUpdated.generation).toEqual(1);
    });

    it('Updates the index template and the data stream if they exist and the version is different', async () => {
      const esClient = esServer.getClient();

      // Initialize with version 1
      await initialize({
        logger,
        elasticsearchClient: esClient,
        dataStream: testDataStream,
        lazyCreation: false,
      });

      const {
        data_streams: [dataStream],
      } = await esClient.indices.getDataStream({ name: testDataStream.name });
      expect(dataStream.generation).toEqual(1);

      const {
        index_templates: [indexTemplate],
      } = await esClient.indices.getIndexTemplate({ name: testDataStream.name });
      expect(indexTemplate.index_template._meta?.version).toEqual(1);

      // Create a document with unmapped field
      await esClient.create({
        refresh: true,
        index: testDataStream.name,
        id: 'doc-1',
        document: {
          '@timestamp': new Date().toISOString(),
          mappedField: 'doc-1',
          unmappedFieldRequired: 'test',
        },
      });

      // Search for mappedFieldRequired - should be empty since field is not mapped yet
      const doc1EsResponse = await esClient.search({
        index: testDataStream.name,
        query: {
          term: { mappedFieldRequired: 'hello' },
        },
      });
      expect(doc1EsResponse.hits.hits.length).toEqual(0);

      // Update mappings to include mappedFieldRequired
      const nextMappings = {
        ...myTestDocMappings,
        properties: {
          ...myTestDocMappings.properties,
          mappedFieldRequired: mappings.keyword(),
        },
      } satisfies MappingsDefinition;

      const nextDefinition: DataStreamDefinition<typeof nextMappings, MyTestDoc> = {
        ...testDataStream,
        version: 2,
        template: { mappings: nextMappings },
      };

      // Initialize with version 2
      await initialize({
        logger,
        elasticsearchClient: esClient,
        dataStream: nextDefinition,
        lazyCreation: false,
      });

      // Create a document with the newly mapped field
      await esClient.create({
        refresh: 'wait_for',
        index: nextDefinition.name,
        id: 'doc-2',
        document: {
          '@timestamp': new Date().toISOString(),
          mappedField: 'doc-2',
          mappedFieldRequired: 'hello',
        },
      });

      // Search for mappedFieldRequired - should find doc-2
      const doc2EsResponse = await esClient.search({
        index: testDataStream.name,
        query: {
          term: { mappedFieldRequired: 'hello' },
        },
      });
      expect(doc2EsResponse.hits.hits.length).toEqual(1);

      // Verify index template was updated
      const {
        index_templates: [indexTemplateUpdated],
      } = await esClient.indices.getIndexTemplate({ name: nextDefinition.name });
      expect(indexTemplateUpdated.name).toEqual(nextDefinition.name);
      expect(
        indexTemplateUpdated.index_template.template?.mappings?.properties?.mappedFieldRequired
      ).toBeDefined();
      expect(indexTemplateUpdated.index_template._meta?.version).toEqual(2);
      expect(indexTemplateUpdated.index_template._meta?.previousVersions).toContain(1);

      // Verify data stream generation hasn't changed (only template updated)
      const {
        data_streams: [dataStreamUpdated],
      } = await esClient.indices.getDataStream({ name: nextDefinition.name });
      expect(dataStreamUpdated.generation).toEqual(1);
    });
  });

  describe('lazy initialization (lazyCreation: true)', () => {
    it('does not create the data stream if it does not exist with { dataStreamReady: false }', async () => {
      const esClient = esServer.getClient();

      const result = await initialize({
        logger,
        elasticsearchClient: esClient,
        dataStream: testDataStream,
        lazyCreation: true,
      });

      expect(result.dataStreamReady).toBe(false);

      // Verify data stream was not created
      await expect(esClient.indices.getDataStream({ name: testDataStream.name })).rejects.toThrow();
    });

    it('does not create the index template if it does not exist and the data stream does not exist with { dataStreamReady: false }', async () => {
      const esClient = esServer.getClient();

      const result = await initialize({
        logger,
        elasticsearchClient: esClient,
        dataStream: testDataStream,
        lazyCreation: true,
      });

      expect(result.dataStreamReady).toBe(false);

      // Verify index template was not created
      await expect(
        esClient.indices.getIndexTemplate({ name: testDataStream.name })
      ).rejects.toThrow();
    });

    it('creates the index template if the data stream exists', async () => {
      const esClient = esServer.getClient();

      // Create the data stream using a temporary template with a different name
      // This simulates a data stream that was created elsewhere without our template
      const tempTemplateName = `${testDataStream.name}-temp`;
      await esClient.indices.putIndexTemplate({
        name: tempTemplateName,
        index_patterns: [`${testDataStream.name}*`],
        data_stream: {},
        template: {
          mappings: { properties: { '@timestamp': { type: 'date' } } },
        },
      });

      // Create the data stream using the temporary template
      await esClient.indices.createDataStream({ name: testDataStream.name });

      // Verify data stream exists but our template doesn't
      const {
        data_streams: [dataStream],
      } = await esClient.indices.getDataStream({ name: testDataStream.name });
      expect(dataStream).toBeDefined();

      // Verify our template doesn't exist yet
      await expect(
        esClient.indices.getIndexTemplate({ name: testDataStream.name })
      ).rejects.toThrow();

      // Now initialize with lazyCreation: true - should create our template since data stream exists
      const result = await initialize({
        logger,
        elasticsearchClient: esClient,
        dataStream: testDataStream,
        lazyCreation: true,
      });

      expect(result.dataStreamReady).toBe(true);

      // Verify our index template was created
      const {
        index_templates: [indexTemplate],
      } = await esClient.indices.getIndexTemplate({ name: testDataStream.name });
      expect(indexTemplate.name).toEqual(testDataStream.name);
      expect(indexTemplate.index_template._meta?.version).toEqual(1);

      // Note: We don't clean up the temporary template here as it's in use by the data stream
      // The afterEach cleanup will handle removing the data stream and all templates
    });

    it('updates the data stream if the data stream exists', async () => {
      const esClient = esServer.getClient();

      // Create data stream and template first
      await initialize({
        logger,
        elasticsearchClient: esClient,
        dataStream: testDataStream,
        lazyCreation: false,
      });

      const {
        data_streams: [dataStream],
      } = await esClient.indices.getDataStream({ name: testDataStream.name });
      expect(dataStream.generation).toEqual(1);

      // Update mappings
      const nextMappings = {
        ...myTestDocMappings,
        properties: {
          ...myTestDocMappings.properties,
          mappedFieldRequired: mappings.keyword(),
        },
      } satisfies MappingsDefinition;

      const nextDefinition: DataStreamDefinition<typeof nextMappings, MyTestDoc> = {
        ...testDataStream,
        version: 2,
        template: { mappings: nextMappings },
      };

      // Initialize with lazyCreation: true - should update since data stream exists
      const result = await initialize({
        logger,
        elasticsearchClient: esClient,
        dataStream: nextDefinition,
        lazyCreation: true,
      });

      expect(result.dataStreamReady).toBe(true);

      // Verify data stream still exists and generation hasn't changed
      const {
        data_streams: [dataStreamUpdated],
      } = await esClient.indices.getDataStream({ name: nextDefinition.name });
      expect(dataStreamUpdated.generation).toEqual(1);
    });

    it('updates the index template if the data stream exists even if lazyCreation is true', async () => {
      const esClient = esServer.getClient();

      // Create data stream and template first
      await initialize({
        logger,
        elasticsearchClient: esClient,
        dataStream: testDataStream,
        lazyCreation: false,
      });

      const {
        index_templates: [indexTemplate],
      } = await esClient.indices.getIndexTemplate({ name: testDataStream.name });
      expect(indexTemplate.index_template._meta?.version).toEqual(1);

      // Update mappings and version
      const nextMappings = {
        ...myTestDocMappings,
        properties: {
          ...myTestDocMappings.properties,
          mappedFieldRequired: mappings.keyword(),
        },
      } satisfies MappingsDefinition;

      const nextDefinition: DataStreamDefinition<typeof nextMappings, MyTestDoc> = {
        ...testDataStream,
        version: 2,
        template: { mappings: nextMappings },
      };

      // Initialize with lazyCreation: true - should update template since data stream exists
      const result = await initialize({
        logger,
        elasticsearchClient: esClient,
        dataStream: nextDefinition,
        lazyCreation: true,
      });

      expect(result.dataStreamReady).toBe(true);

      // Verify index template was updated
      const {
        index_templates: [indexTemplateUpdated],
      } = await esClient.indices.getIndexTemplate({ name: nextDefinition.name });
      expect(indexTemplateUpdated.index_template._meta?.version).toEqual(2);
      expect(indexTemplateUpdated.index_template._meta?.previousVersions).toContain(1);
      expect(
        indexTemplateUpdated.index_template.template?.mappings?.properties?.mappedFieldRequired
      ).toBeDefined();
    });
  });

  describe('template-only initialization (DataStreamClient.initializeTemplate)', () => {
    it('creates the index template without creating the data stream', async () => {
      const esClient = esServer.getClient();

      await DataStreamClient.initializeTemplate({
        logger,
        elasticsearchClient: esClient,
        dataStream: testDataStream,
      });

      const {
        index_templates: [indexTemplate],
      } = await esClient.indices.getIndexTemplate({ name: testDataStream.name });
      expect(indexTemplate.name).toEqual(testDataStream.name);
      expect(indexTemplate.index_template._meta?.version).toEqual(1);

      await expect(esClient.indices.getDataStream({ name: testDataStream.name })).rejects.toThrow();
    });

    it('is idempotent and updates the template when the version is incremented', async () => {
      const esClient = esServer.getClient();

      await DataStreamClient.initializeTemplate({
        logger,
        elasticsearchClient: esClient,
        dataStream: testDataStream,
      });

      // No-op call with the same definition.
      await DataStreamClient.initializeTemplate({
        logger,
        elasticsearchClient: esClient,
        dataStream: testDataStream,
      });

      const nextMappings = {
        ...myTestDocMappings,
        properties: {
          ...myTestDocMappings.properties,
          mappedFieldRequired: mappings.keyword(),
        },
      } satisfies MappingsDefinition;

      const nextDefinition: DataStreamDefinition<typeof nextMappings, MyTestDoc> = {
        ...testDataStream,
        version: 2,
        template: { mappings: nextMappings },
      };

      await DataStreamClient.initializeTemplate({
        logger,
        elasticsearchClient: esClient,
        dataStream: nextDefinition,
      });

      const {
        index_templates: [indexTemplate],
      } = await esClient.indices.getIndexTemplate({ name: nextDefinition.name });
      expect(indexTemplate.index_template._meta?.version).toEqual(2);
      expect(indexTemplate.index_template._meta?.previousVersions).toContain(1);
      expect(
        indexTemplate.index_template.template?.mappings?.properties?.mappedFieldRequired
      ).toBeDefined();

      await expect(esClient.indices.getDataStream({ name: testDataStream.name })).rejects.toThrow();
    });

    it('lets a subsequent DataStreamClient.initialize create the data stream from the installed template', async () => {
      const esClient = esServer.getClient();

      await DataStreamClient.initializeTemplate({
        logger,
        elasticsearchClient: esClient,
        dataStream: testDataStream,
      });

      const client = await DataStreamClient.initialize({
        logger,
        elasticsearchClient: esClient,
        dataStream: testDataStream,
      });

      expect(client).toBeDefined();

      const {
        data_streams: [dataStream],
      } = await esClient.indices.getDataStream({ name: testDataStream.name });
      expect(dataStream).toBeDefined();
      expect(dataStream.generation).toEqual(1);
    });

    it('migrates mappings on the existing write index when the version is bumped', async () => {
      const esClient = esServer.getClient();

      // Create both template and data stream at version 1.
      await initialize({
        logger,
        elasticsearchClient: esClient,
        dataStream: testDataStream,
        lazyCreation: false,
      });

      const {
        data_streams: [originalDataStream],
      } = await esClient.indices.getDataStream({ name: testDataStream.name });
      const writeIndex = originalDataStream.indices[originalDataStream.indices.length - 1];
      expect(writeIndex).toBeDefined();

      // Bump the version with new mappings and run template-only initialization.
      const nextMappings = {
        ...myTestDocMappings,
        properties: {
          ...myTestDocMappings.properties,
          mappedFieldRequired: mappings.keyword(),
        },
      } satisfies MappingsDefinition;

      const nextDefinition: DataStreamDefinition<typeof nextMappings, MyTestDoc> = {
        ...testDataStream,
        version: 2,
        template: { mappings: nextMappings },
      };

      await DataStreamClient.initializeTemplate({
        logger,
        elasticsearchClient: esClient,
        dataStream: nextDefinition,
      });

      // Index template is bumped.
      const {
        index_templates: [indexTemplate],
      } = await esClient.indices.getIndexTemplate({ name: nextDefinition.name });
      expect(indexTemplate.index_template._meta?.version).toEqual(2);

      // New mapping is applied to the existing write index, not just future rollovers.
      const writeIndexMappings = await esClient.indices.getMapping({
        index: writeIndex.index_name,
      });
      expect(
        writeIndexMappings[writeIndex.index_name].mappings.properties?.mappedFieldRequired
      ).toEqual({ type: 'keyword', ignore_above: 1024 });
    });

    it('allows a DataStreamClient.fromDefinition-built client to write through ES auto-creation', async () => {
      const esClient = esServer.getClient();

      await DataStreamClient.initializeTemplate({
        logger,
        elasticsearchClient: esClient,
        dataStream: testDataStream,
      });

      // Data stream still does not exist after template-only setup.
      await expect(esClient.indices.getDataStream({ name: testDataStream.name })).rejects.toThrow();

      const client = DataStreamClient.fromDefinition<typeof myTestDocMappings, MyTestDoc>({
        dataStream: testDataStream,
        elasticsearchClient: esClient,
      });

      // Writing through the client triggers ES to auto-create the data stream from our template.
      await client.create({
        documents: [
          {
            '@timestamp': new Date().toISOString(),
            mappedFieldRequired: 'value',
            nestedField: { mappedFieldRequired: 'nested-value' },
            arrayField: ['a', 'b'],
            unmappedFieldRequired: 'unmapped',
          } as MyTestDoc,
        ],
        refresh: true,
      });

      const {
        data_streams: [dataStream],
      } = await esClient.indices.getDataStream({ name: testDataStream.name });
      expect(dataStream).toBeDefined();
      expect(dataStream.generation).toEqual(1);
    });
  });

  describe('rollover mappings update strategy', () => {
    const v1Mappings = {
      properties: {
        '@timestamp': mappings.date(),
        mappedField: mappings.keyword(),
      },
    } satisfies MappingsDefinition;

    // Breaking change rejected by putMapping: `mappedField` becomes an alias of `renamedField`.
    const v2Mappings = {
      properties: {
        '@timestamp': mappings.date(),
        renamedField: mappings.keyword(),
        mappedField: { type: 'alias', path: 'renamedField' },
      },
    } satisfies MappingsDefinition;

    const v2Definition: DataStreamDefinition<typeof v2Mappings> = {
      name: testDataStream.name,
      version: 2,
      mappingsUpdateStrategy: 'rollover',
      template: { mappings: v2Mappings },
    };

    const getDataStream = async () => {
      const {
        data_streams: [dataStream],
      } = await esServer.getClient().indices.getDataStream({ name: testDataStream.name });
      return dataStream;
    };

    const getIndexMappings = async (index: string) => {
      const {
        [index]: { mappings: indexMappings },
      } = await esServer.getClient().indices.getMapping({ index });
      return indexMappings;
    };

    it('rolls over lazily instead of updating existing backing indices when the version is incremented', async () => {
      const esClient = esServer.getClient();

      // Data stream created before the rollover strategy was enabled: its indices are not stamped.
      const v1Definition: DataStreamDefinition<typeof v1Mappings> = {
        name: testDataStream.name,
        version: 1,
        template: { mappings: v1Mappings },
      };
      await initialize({
        logger,
        elasticsearchClient: esClient,
        dataStream: v1Definition,
        lazyCreation: false,
      });
      await esClient.index({
        index: testDataStream.name,
        document: { '@timestamp': new Date().toISOString(), mappedField: 'v1' },
        refresh: true,
      });
      const {
        indices: [{ index_name: firstBackingIndex }],
      } = await getDataStream();

      const result = await initialize({
        logger,
        elasticsearchClient: esClient,
        dataStream: v2Definition,
        lazyCreation: false,
      });
      expect(result.dataStreamReady).toBe(true);

      const {
        index_templates: [indexTemplate],
      } = await esClient.indices.getIndexTemplate({ name: testDataStream.name });
      expect(indexTemplate.index_template._meta?.version).toEqual(2);
      expect(indexTemplate.index_template.template?.mappings?._meta).toEqual({ version: 2 });

      // Existing backing indices are left untouched until the next write rolls the data stream over.
      const upgradedDataStream = await getDataStream();
      expect(upgradedDataStream.generation).toEqual(1);
      expect(upgradedDataStream.rollover_on_write).toBe(true);
      const firstBackingIndexMappings = await getIndexMappings(firstBackingIndex);
      expect(firstBackingIndexMappings.properties?.mappedField).toHaveProperty('type', 'keyword');
      expect(firstBackingIndexMappings.properties?.renamedField).toBeUndefined();

      await esClient.index({
        index: testDataStream.name,
        document: { '@timestamp': new Date().toISOString(), renamedField: 'v2' },
        refresh: true,
      });

      const rolledOverDataStream = await getDataStream();
      expect(rolledOverDataStream.generation).toEqual(2);
      expect(rolledOverDataStream.rollover_on_write).toBe(false);
      const writeIndexMappings = await getIndexMappings(
        rolledOverDataStream.indices[rolledOverDataStream.indices.length - 1].index_name
      );
      expect(writeIndexMappings._meta).toEqual({ version: 2 });
      expect(writeIndexMappings.properties?.mappedField).toEqual({
        type: 'alias',
        path: 'renamedField',
      });

      // The old field name resolves to the real field in old indices and to the alias in new ones.
      const { hits } = await esClient.search({
        index: testDataStream.name,
        query: { terms: { mappedField: ['v1', 'v2'] } },
      });
      expect(hits.hits).toHaveLength(2);

      // Restarting with the same definition does not schedule another rollover.
      await initialize({
        logger,
        elasticsearchClient: esClient,
        dataStream: v2Definition,
        lazyCreation: false,
      });
      const restartedDataStream = await getDataStream();
      expect(restartedDataStream.generation).toEqual(2);
      expect(restartedDataStream.rollover_on_write).toBe(false);
    });

    it('completes an upgrade interrupted between the index template update and the rollover', async () => {
      const esClient = esServer.getClient();

      const v1Definition: DataStreamDefinition<typeof v1Mappings> = {
        name: testDataStream.name,
        version: 1,
        mappingsUpdateStrategy: 'rollover',
        template: { mappings: v1Mappings },
      };
      await initialize({
        logger,
        elasticsearchClient: esClient,
        dataStream: v1Definition,
        lazyCreation: false,
      });
      const {
        indices: [{ index_name: firstBackingIndex }],
      } = await getDataStream();
      expect((await getIndexMappings(firstBackingIndex))._meta).toEqual({ version: 1 });

      // A previous start installed the v2 index template but did not roll over.
      await initializeIndexTemplate({
        logger,
        elasticsearchClient: esClient,
        dataStream: v2Definition,
        existingIndexTemplate: await getExistingIndexTemplate(
          esClient,
          testDataStream.name,
          logger
        ),
        skipCreation: false,
      });

      await initialize({
        logger,
        elasticsearchClient: esClient,
        dataStream: v2Definition,
        lazyCreation: false,
      });

      const dataStream = await getDataStream();
      expect(dataStream.generation).toEqual(1);
      expect(dataStream.rollover_on_write).toBe(true);
    });
  });
});
