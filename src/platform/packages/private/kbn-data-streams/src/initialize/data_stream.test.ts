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

    (elasticsearchClient.indices.simulateTemplate as jest.Mock).mockResolvedValue({
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
    });

    // simulateTemplate is called as a named-with-body simulate: the body fields drive resolution
    // (matching what `putIndexTemplate` will later install), and `name` lets ES treat this as
    // "simulate replacing the existing template" rather than "create a brand-new template that
    // conflicts with the existing one".
    expect(elasticsearchClient.indices.simulateTemplate).toHaveBeenCalledTimes(1);
    const simulateArg = (elasticsearchClient.indices.simulateTemplate as jest.Mock).mock
      .calls[0][0];
    expect(simulateArg.name).toEqual(dataStream.name);
    expect(simulateArg.index_patterns).toEqual([`${dataStream.name}*`]);
    expect(simulateArg.template?.lifecycle).toEqual(newLifecycle);
    expect(simulateArg.template?.mappings?.properties?.mappedField).toEqual({
      ignore_above: 1024,
      type: 'keyword',
    });
    expect(elasticsearchClient.indices.putMapping).toHaveBeenCalledTimes(1);
    expect(elasticsearchClient.indices.putDataLifecycle).not.toHaveBeenCalled();
    expect(elasticsearchClient.indices.deleteDataLifecycle).not.toHaveBeenCalled();
  });

  it('runs the migration round-trip even when deployed version is greater than or equal to the requested version', async () => {
    // Asserts AC #4: the `deployedVersion >= version` early-return guard is gone. Every init
    // that has an existing data stream runs the migration regardless of `_meta.version`.
    const dataStream: DataStreamDefinition<typeof testMappings> = {
      name: 'test-data-stream',
      version: 1,
      template: { mappings: testMappings },
    };

    (elasticsearchClient.indices.simulateTemplate as jest.Mock).mockResolvedValue({
      template: { mappings: dataStream.template.mappings },
    });
    (elasticsearchClient.indices.putMapping as jest.Mock).mockResolvedValue({
      acknowledged: true,
    });

    const result = await initializeDataStream({
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
          // Deployed version (2) is greater than requested version (1) — old short-circuit
          // would have returned early without calling simulateTemplate or putMapping.
          _meta: { version: 2, previousVersions: [1] },
        },
      } as any,
    });

    expect(result).toEqual({ migrated: true });
    expect(elasticsearchClient.indices.simulateTemplate).toHaveBeenCalledTimes(1);
    expect(elasticsearchClient.indices.putMapping).toHaveBeenCalledTimes(1);
  });

  it('reports migrated: false when the data stream has no write index yet', async () => {
    const dataStream: DataStreamDefinition<typeof testMappings> = {
      name: 'test-data-stream',
      version: 1,
      template: { mappings: testMappings },
    };

    const result = await initializeDataStream({
      logger,
      elasticsearchClient,
      dataStream,
      existingDataStream: {
        name: dataStream.name,
        indices: [],
      } as any,
      existingIndexTemplate: undefined,
    });

    expect(result).toEqual({ migrated: false });
    expect(elasticsearchClient.indices.simulateTemplate).not.toHaveBeenCalled();
    expect(elasticsearchClient.indices.putMapping).not.toHaveBeenCalled();
  });
});
