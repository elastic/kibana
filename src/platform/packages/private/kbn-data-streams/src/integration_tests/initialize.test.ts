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
});
