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
import { mappings, type MappingsDefinition } from '@kbn/es-mappings';
import { initialize } from '../initialize';

/**
 * Asserts the load-bearing invariant from elastic/kibana#268853: the index template's
 * `_meta.version` is the LAST write of an `initialize` call. If migration fails (either at
 * `simulateTemplate` or `putMapping`), the on-disk `_meta.version` stays at the old number so
 * the next boot can retry the migration cleanly once the underlying cause is resolved.
 */
describe('Data streams initialize - defer template version bump until migration succeeds', () => {
  let esServer: EsTestCluster;
  let logger: Logger;

  const baseMappings = {
    properties: {
      '@timestamp': mappings.date(),
      mappedField: mappings.keyword(),
    },
  } satisfies MappingsDefinition;

  const dataStreamName = 'test-version-bump';

  const cleanup = async () => {
    const client = esServer.getClient();
    await client.indices.deleteDataStream({ name: dataStreamName }).catch(() => {});
    await client.indices.deleteIndexTemplate({ name: dataStreamName }).catch(() => {});
  };

  beforeAll(async () => {
    jest.setTimeout(60_000);
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

  it('leaves template _meta.version unchanged when putMapping rejects an incompatible mapping change', async () => {
    const esClient = esServer.getClient();

    const v1Definition: DataStreamDefinition<typeof baseMappings> = {
      name: dataStreamName,
      version: 1,
      template: { mappings: baseMappings },
    };

    await initialize({
      logger,
      elasticsearchClient: esClient,
      dataStream: v1Definition,
      lazyCreation: false,
    });

    // Materialize the v1 mapping on the write index by indexing a document. Without an indexed
    // document, ES may not have concretized `mappedField` on the write index and a subsequent
    // putMapping with a conflicting type may not reject.
    await esClient.create({
      refresh: 'wait_for',
      index: dataStreamName,
      id: 'doc-v1',
      document: {
        '@timestamp': new Date().toISOString(),
        mappedField: 'a-value',
      },
    });

    // Incompatible mapping change: `mappedField` is already a `keyword` on the write index;
    // attempting to remap it to `text` is rejected by ES with
    // `illegal_argument_exception: mapper [mappedField] cannot be changed from type [keyword] to [text]`.
    const incompatibleMappings = {
      properties: {
        '@timestamp': mappings.date(),
        mappedField: mappings.text(),
      },
    } satisfies MappingsDefinition;

    const v2BadDefinition: DataStreamDefinition<typeof incompatibleMappings> = {
      name: dataStreamName,
      version: 2,
      template: { mappings: incompatibleMappings },
    };

    await expect(
      initialize({
        logger,
        elasticsearchClient: esClient,
        dataStream: v2BadDefinition,
        lazyCreation: false,
      })
    ).rejects.toThrow();

    // The load-bearing assertion: template _meta.version stays at 1 even though we attempted
    // to bump it to 2.
    const {
      index_templates: [indexTemplate],
    } = await esClient.indices.getIndexTemplate({ name: dataStreamName });
    expect(indexTemplate.index_template._meta?.version).toEqual(1);
  });

  it('recovers on the next boot once the definition is fixed (template bumps to 2)', async () => {
    const esClient = esServer.getClient();

    // Reach the same failed state as the previous test: template on disk at v1 after a failed
    // attempt to bump to v2 with an incompatible mapping.
    const v1Definition: DataStreamDefinition<typeof baseMappings> = {
      name: dataStreamName,
      version: 1,
      template: { mappings: baseMappings },
    };

    await initialize({
      logger,
      elasticsearchClient: esClient,
      dataStream: v1Definition,
      lazyCreation: false,
    });

    await esClient.create({
      refresh: 'wait_for',
      index: dataStreamName,
      id: 'doc-v1',
      document: {
        '@timestamp': new Date().toISOString(),
        mappedField: 'a-value',
      },
    });

    const incompatibleMappings = {
      properties: {
        '@timestamp': mappings.date(),
        mappedField: mappings.text(),
      },
    } satisfies MappingsDefinition;

    await expect(
      initialize({
        logger,
        elasticsearchClient: esClient,
        dataStream: {
          name: dataStreamName,
          version: 2,
          template: { mappings: incompatibleMappings },
        },
        lazyCreation: false,
      })
    ).rejects.toThrow();

    const {
      index_templates: [stillV1Template],
    } = await esClient.indices.getIndexTemplate({ name: dataStreamName });
    expect(stillV1Template.index_template._meta?.version).toEqual(1);

    // Now ship a compatible v2 (a fresh field added, the original `keyword` field kept).
    const compatibleNextMappings = {
      properties: {
        '@timestamp': mappings.date(),
        mappedField: mappings.keyword(),
        addedField: mappings.keyword(),
      },
    } satisfies MappingsDefinition;

    const result = await initialize({
      logger,
      elasticsearchClient: esClient,
      dataStream: {
        name: dataStreamName,
        version: 2,
        template: { mappings: compatibleNextMappings },
      },
      lazyCreation: false,
    });

    expect(result.dataStreamReady).toEqual(true);

    // Template is bumped, and the new field is present on the write index mapping.
    const {
      index_templates: [bumpedTemplate],
    } = await esClient.indices.getIndexTemplate({ name: dataStreamName });
    expect(bumpedTemplate.index_template._meta?.version).toEqual(2);
    expect(bumpedTemplate.index_template._meta?.previousVersions).toContain(1);

    const {
      data_streams: [dataStream],
    } = await esClient.indices.getDataStream({ name: dataStreamName });
    const writeIndex = dataStream.indices[dataStream.indices.length - 1];
    const writeIndexMappings = await esClient.indices.getMapping({
      index: writeIndex.index_name,
    });
    expect(writeIndexMappings[writeIndex.index_name].mappings.properties?.addedField).toEqual({
      type: 'keyword',
      ignore_above: 1024,
    });

    // The newly mapped field is searchable on a doc indexed after the migration.
    await esClient.create({
      refresh: 'wait_for',
      index: dataStreamName,
      id: 'doc-v2',
      document: {
        '@timestamp': new Date().toISOString(),
        mappedField: 'still-keyword',
        addedField: 'hello',
      },
    });

    const searchResponse = await esClient.search({
      index: dataStreamName,
      query: { term: { addedField: 'hello' } },
    });
    expect(searchResponse.hits.hits.length).toEqual(1);
  });

  it('does not bump template _meta.version when simulateTemplate rejects', async () => {
    const esClient = esServer.getClient();

    const v1Definition: DataStreamDefinition<typeof baseMappings> = {
      name: dataStreamName,
      version: 1,
      template: { mappings: baseMappings },
    };

    await initialize({
      logger,
      elasticsearchClient: esClient,
      dataStream: v1Definition,
      lazyCreation: false,
    });

    // Trigger a real `simulateTemplate` rejection: reference a component template that does
    // not exist. ES rejects the inline simulate with
    // `component template [nonexistent-component-template] does not exist` unless
    // `ignore_missing_component_templates` includes it (we don't set that field).
    const v2WithBadComposedOf: DataStreamDefinition<typeof baseMappings> = {
      name: dataStreamName,
      version: 2,
      template: {
        mappings: baseMappings,
        composedOf: ['nonexistent-component-template'],
      },
    };

    await expect(
      initialize({
        logger,
        elasticsearchClient: esClient,
        dataStream: v2WithBadComposedOf,
        lazyCreation: false,
      })
    ).rejects.toThrow();

    // Template `_meta.version` stays at 1 because putIndexTemplate was never reached.
    const {
      index_templates: [indexTemplate],
    } = await esClient.indices.getIndexTemplate({ name: dataStreamName });
    expect(indexTemplate.index_template._meta?.version).toEqual(1);
  });
});
