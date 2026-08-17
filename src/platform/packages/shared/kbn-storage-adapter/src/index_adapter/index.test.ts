/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { TransportResult } from '@elastic/elasticsearch';
import { errors } from '@elastic/elasticsearch';
import { esql } from '@elastic/esql';
import type { StorageClientBulkRequest, StorageTransportOptions } from '../..';
import { getSchemaVersion, StorageIndexAdapter, type StorageSettings } from '../..';
import type { ResolvedComponentTemplateDependency } from '../get_schema_version';

const createLoggerMock = (): jest.Mocked<Logger> => {
  const logger = {
    debug: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
    get: jest.fn(),
  } as unknown as jest.Mocked<Logger>;
  logger.get.mockReturnValue(logger);
  return logger;
};

const storageSettings = {
  name: 'test_index',
  schema: {
    properties: {
      foo: { type: 'keyword' as const },
    },
  },
} satisfies StorageSettings;

const composedStorageSettings = {
  ...storageSettings,
  priority: 600,
  componentTemplate: {
    name: 'test_index@mappings',
    required: ['shared@mappings'],
    optional: ['test_index@custom'],
  },
} satisfies StorageSettings;

const createMockEsClient = () => {
  const client = {
    info: jest.fn().mockResolvedValue({
      version: { build_flavor: 'default' },
    }),
    search: jest.fn().mockResolvedValue({
      hits: { hits: [{ _id: 'doc1', _index: 'test_index', _source: { foo: 'bar' } }] },
    }),
    index: jest.fn().mockResolvedValue({
      _id: 'doc1',
      _index: 'test_index-000001',
      _shards: { successful: 1 },
      result: 'created',
    }),
    bulk: jest.fn().mockResolvedValue({
      errors: false,
      items: [{ index: { _id: 'doc1', result: 'created', status: 201 } }],
      took: 1,
    }),
    delete: jest.fn().mockResolvedValue({ result: 'deleted' }),
    cluster: {
      putComponentTemplate: jest.fn().mockResolvedValue({ acknowledged: true }),
      getComponentTemplate: jest.fn().mockResolvedValue({
        component_templates: [
          {
            name: 'test_index@mappings',
            component_template: {
              template: {},
            },
          },
        ],
      }),
      deleteComponentTemplate: jest.fn().mockResolvedValue({ acknowledged: true }),
    },
    indices: {
      putIndexTemplate: jest.fn().mockResolvedValue({}),
      getIndexTemplate: jest.fn().mockResolvedValue({
        index_templates: [
          {
            index_template: {
              _meta: { version: 'current' },
            },
          },
        ],
      }),
      get: jest.fn().mockResolvedValue({
        'test_index-000001': {
          mappings: { _meta: { version: 'current' } },
          aliases: { test_index: { is_write_index: true } },
        },
      }),
      getAlias: jest.fn().mockResolvedValue({
        'test_index-000001': {
          aliases: { test_index: { is_write_index: true } },
        },
      }),
      create: jest.fn().mockResolvedValue({}),
      delete: jest.fn().mockResolvedValue({ acknowledged: true }),
      deleteIndexTemplate: jest.fn().mockResolvedValue({ acknowledged: true }),
      exists: jest.fn().mockResolvedValue(true),
      simulateIndexTemplate: jest.fn().mockResolvedValue({
        template: { mappings: {} },
      }),
      putMapping: jest.fn().mockResolvedValue({}),
      putSettings: jest.fn().mockResolvedValue({}),
    },
  } as unknown as jest.Mocked<ElasticsearchClient>;
  return client;
};

interface EsqlQueryMock {
  esql: {
    query: jest.Mock;
  };
}

const addEsqlQueryMock = (client: jest.Mocked<ElasticsearchClient>, query: jest.Mock): void => {
  (client as unknown as EsqlQueryMock).esql = { query };
};

const requiredDependencyV1 = {
  name: 'shared@mappings',
  componentTemplate: {
    version: 1,
    template: {
      mappings: {
        properties: {
          shared: { type: 'keyword' },
        },
      },
    },
  },
} satisfies ResolvedComponentTemplateDependency;

const requiredDependencyV2 = {
  name: 'shared@mappings',
  componentTemplate: {
    version: 2,
    template: {
      mappings: {
        properties: {
          shared: { type: 'keyword' },
          sharedV2: { type: 'keyword' },
        },
      },
    },
  },
} satisfies ResolvedComponentTemplateDependency;

const missingOptionalDependency = {
  name: 'test_index@custom',
} satisfies ResolvedComponentTemplateDependency;

const presentOptionalDependency = {
  name: 'test_index@custom',
  componentTemplate: {
    version: 1,
    template: {
      mappings: {
        properties: {
          optional: { type: 'keyword' },
        },
      },
    },
  },
} satisfies ResolvedComponentTemplateDependency;

describe('getSchemaVersion', () => {
  it('preserves the historical hash when component composition is not configured', () => {
    expect(getSchemaVersion(storageSettings)).toBe('f18ba576ba6e6125d9b6d5009d67d6c0964eea8e');
  });

  it('includes every component composition field in the version', () => {
    const composedVersion = getSchemaVersion(composedStorageSettings);

    expect(
      getSchemaVersion({
        ...composedStorageSettings,
        componentTemplate: {
          ...composedStorageSettings.componentTemplate,
          name: 'test_index@other-mappings',
        },
      })
    ).not.toBe(composedVersion);
    expect(
      getSchemaVersion({
        ...composedStorageSettings,
        componentTemplate: {
          ...composedStorageSettings.componentTemplate,
          required: ['other-shared@mappings'],
        },
      })
    ).not.toBe(composedVersion);
    expect(
      getSchemaVersion({
        ...composedStorageSettings,
        componentTemplate: {
          ...composedStorageSettings.componentTemplate,
          optional: ['test_index@other-custom'],
        },
      })
    ).not.toBe(composedVersion);
  });

  it('hashes dependency presence and mappings but ignores other dependency fields', () => {
    const dependencyVersion = getSchemaVersion(composedStorageSettings, [
      requiredDependencyV1,
      missingOptionalDependency,
    ]);
    const dependencyWithNonMappingChanges = {
      name: requiredDependencyV1.name,
      componentTemplate: {
        version: 99,
        _meta: { description: 'changed metadata' },
        template: {
          mappings: requiredDependencyV1.componentTemplate.template.mappings,
          settings: { index: { number_of_shards: 2 } },
          aliases: { ignored_alias: {} },
        },
      },
    } satisfies ResolvedComponentTemplateDependency;
    const dependencyWithMappingChange = {
      name: requiredDependencyV1.name,
      componentTemplate: {
        ...requiredDependencyV1.componentTemplate,
        template: {
          mappings: {
            properties: {
              shared: { type: 'keyword' },
              mappingOnlyChange: { type: 'keyword' },
            },
          },
        },
      },
    } satisfies ResolvedComponentTemplateDependency;

    expect(
      getSchemaVersion(composedStorageSettings, [
        dependencyWithNonMappingChanges,
        missingOptionalDependency,
      ])
    ).toBe(dependencyVersion);
    expect(
      getSchemaVersion(composedStorageSettings, [
        dependencyWithMappingChange,
        missingOptionalDependency,
      ])
    ).not.toBe(dependencyVersion);
    expect(
      getSchemaVersion(composedStorageSettings, [requiredDependencyV1, presentOptionalDependency])
    ).not.toBe(dependencyVersion);
  });

  it('includes required component template mappings in the composed version', () => {
    expect(
      getSchemaVersion(composedStorageSettings, [requiredDependencyV1, missingOptionalDependency])
    ).not.toBe(
      getSchemaVersion(composedStorageSettings, [requiredDependencyV2, missingOptionalDependency])
    );
  });

  it('distinguishes a missing optional component from a present component', () => {
    expect(
      getSchemaVersion(composedStorageSettings, [requiredDependencyV2, missingOptionalDependency])
    ).not.toBe(
      getSchemaVersion(composedStorageSettings, [requiredDependencyV2, presentOptionalDependency])
    );
  });
});

describe('StorageIndexAdapter - transport options forwarding', () => {
  let esClient: jest.Mocked<ElasticsearchClient>;
  let loggerMock: jest.Mocked<Logger>;
  const transportOptions: StorageTransportOptions = {
    maxResponseSize: 50 * 1024 * 1024,
    requestTimeout: 30_000,
  };

  beforeEach(() => {
    esClient = createMockEsClient();
    loggerMock = createLoggerMock();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('forwards transport options to esClient.search', async () => {
    const adapter = new StorageIndexAdapter(esClient, loggerMock, storageSettings);
    const client = adapter.getClient();

    await client.search(
      { track_total_hits: false, size: 10, query: { match_all: {} } },
      transportOptions
    );

    expect(esClient.search).toHaveBeenCalledWith(
      expect.objectContaining({ index: 'test_index' }),
      transportOptions
    );
  });

  it('forwards transport options to esClient.index', async () => {
    const adapter = new StorageIndexAdapter(esClient, loggerMock, storageSettings);
    const client = adapter.getClient();

    await client.index({ id: 'doc1', document: { foo: 'bar' } }, transportOptions);

    expect(esClient.index).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'doc1', require_alias: true }),
      transportOptions
    );
  });

  it('forwards transport options to esClient.bulk', async () => {
    const adapter = new StorageIndexAdapter(esClient, loggerMock, storageSettings);
    const client = adapter.getClient();

    await client.bulk(
      {
        operations: [{ index: { _id: 'doc1', document: { foo: 'bar' } } }],
      },
      transportOptions
    );

    expect(esClient.bulk).toHaveBeenCalledWith(
      expect.objectContaining({ require_alias: true }),
      transportOptions
    );
  });

  it('forwards if_seq_no and if_primary_term for bulk index operations', async () => {
    const adapter = new StorageIndexAdapter(esClient, loggerMock, storageSettings);
    const client = adapter.getClient();

    await client.bulk({
      operations: [
        {
          index: {
            _id: 'doc1',
            if_seq_no: 7,
            if_primary_term: 2,
            document: { foo: 'bar' },
          },
        },
      ],
    });

    expect(esClient.bulk).toHaveBeenCalledWith(
      expect.objectContaining({
        operations: [{ index: { _id: 'doc1', if_seq_no: 7, if_primary_term: 2 } }, { foo: 'bar' }],
      })
    );
  });

  it('rejects bulk index operations with only one OCC field set', async () => {
    const adapter = new StorageIndexAdapter(esClient, loggerMock, storageSettings);
    const client = adapter.getClient();

    expect(() =>
      client.bulk({
        operations: [
          {
            index: {
              _id: 'doc1',
              if_seq_no: 7,
              document: { foo: 'bar' },
            },
          } as unknown as StorageClientBulkRequest<{ _id?: string }>['operations'][number],
        ],
      })
    ).toThrow('Bulk index OCC requires both if_seq_no and if_primary_term');

    expect(esClient.bulk).not.toHaveBeenCalled();
  });

  it('forwards transport options to esClient.delete', async () => {
    const adapter = new StorageIndexAdapter(esClient, loggerMock, storageSettings);
    const client = adapter.getClient();

    await client.delete({ id: 'doc1' }, transportOptions);

    expect(esClient.delete).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'doc1' }),
      transportOptions
    );
  });

  it('forwards transport options through get to esClient.search', async () => {
    const adapter = new StorageIndexAdapter(esClient, loggerMock, storageSettings);
    const client = adapter.getClient();

    await client.get({ id: 'doc1' }, transportOptions);

    expect(esClient.search).toHaveBeenCalledWith(
      expect.objectContaining({ terminate_after: 1 }),
      transportOptions
    );
  });

  it('includes settings in the index template', async () => {
    const adapter = new StorageIndexAdapter(esClient, loggerMock, storageSettings);
    const client = adapter.getClient();

    await client.index({ id: 'doc1', document: { foo: 'bar' } });

    expect(esClient.indices.putIndexTemplate).toHaveBeenCalledWith(
      expect.objectContaining({
        template: expect.objectContaining({
          settings: expect.objectContaining({
            auto_expand_replicas: '0-1',
            number_of_shards: 1,
          }),
        }),
      })
    );
  });

  it('keeps schema mappings inline when component template composition is not configured', async () => {
    const adapter = new StorageIndexAdapter(esClient, loggerMock, storageSettings, {
      isServerless: false,
    });

    await adapter.getClient().index({ id: 'doc1', document: { foo: 'bar' } });

    expect(esClient.cluster.putComponentTemplate).not.toHaveBeenCalled();
    expect(esClient.cluster.getComponentTemplate).not.toHaveBeenCalled();
    expect(esClient.indices.putIndexTemplate).toHaveBeenCalledWith(
      expect.objectContaining({
        template: expect.objectContaining({
          mappings: {
            _meta: { version: expect.any(String) },
            dynamic: 'strict',
            properties: {
              foo: { type: 'keyword' },
            },
          },
        }),
      })
    );
    expect(esClient.indices.putIndexTemplate).toHaveBeenCalledWith(
      expect.not.objectContaining({
        composed_of: expect.anything(),
        ignore_missing_component_templates: expect.anything(),
      })
    );
  });

  it('installs the generated component template before the composed index template', async () => {
    const indexManagementClient = createMockEsClient();
    const adapter = new StorageIndexAdapter(esClient, loggerMock, composedStorageSettings, {
      indexManagementClient,
      isServerless: false,
    });

    await adapter.getClient().index({ id: 'doc1', document: { foo: 'bar' } });

    expect(indexManagementClient.cluster.putComponentTemplate).toHaveBeenCalledWith({
      name: 'test_index@mappings',
      create: false,
      template: {
        mappings: {
          _meta: { version: expect.any(String) },
          dynamic: 'strict',
          properties: {
            foo: { type: 'keyword' },
          },
        },
      },
    });
    expect(indexManagementClient.indices.putIndexTemplate).toHaveBeenCalledWith(
      expect.objectContaining({
        priority: 600,
        composed_of: ['shared@mappings', 'test_index@mappings', 'test_index@custom'],
        ignore_missing_component_templates: ['test_index@custom'],
        template: expect.objectContaining({
          aliases: {
            test_index: {
              is_write_index: true,
            },
          },
          mappings: {
            _meta: { version: expect.any(String) },
          },
          settings: expect.objectContaining({
            auto_expand_replicas: '0-1',
            number_of_shards: 1,
          }),
        }),
      })
    );
    expect(
      (indexManagementClient.cluster.putComponentTemplate as jest.Mock).mock.invocationCallOrder[0]
    ).toBeLessThan(
      (indexManagementClient.indices.putIndexTemplate as jest.Mock).mock.invocationCallOrder[0]
    );
  });

  it('uses the management client for composed template management and simulation only', async () => {
    const indexManagementClient = createMockEsClient();
    (esClient.indices.get as jest.Mock).mockResolvedValueOnce({
      'test_index-000001': {
        mappings: { _meta: { version: 'outdated' } },
        aliases: { test_index: { is_write_index: true } },
      },
    });
    (indexManagementClient.indices.simulateIndexTemplate as jest.Mock).mockResolvedValueOnce({
      template: {
        mappings: {
          _meta: { version: 'next' },
          dynamic: 'strict',
          properties: {
            shared: { type: 'keyword' },
            foo: { type: 'keyword' },
          },
        },
      },
    });
    const adapter = new StorageIndexAdapter(esClient, loggerMock, composedStorageSettings, {
      indexManagementClient,
      isServerless: false,
    });

    await adapter.getClient().index({ id: 'doc1', document: { foo: 'bar' } });

    expect(indexManagementClient.cluster.putComponentTemplate).toHaveBeenCalled();
    expect(indexManagementClient.indices.putIndexTemplate).toHaveBeenCalled();
    expect(indexManagementClient.indices.simulateIndexTemplate).toHaveBeenCalled();
    expect(esClient.cluster.putComponentTemplate).not.toHaveBeenCalled();
    expect(esClient.indices.putIndexTemplate).not.toHaveBeenCalled();
    expect(esClient.indices.simulateIndexTemplate).not.toHaveBeenCalled();
    expect(esClient.indices.putMapping).toHaveBeenCalledWith({
      index: 'test_index-000001',
      _meta: { version: 'next' },
      dynamic: 'strict',
      properties: {
        shared: { type: 'keyword' },
        foo: { type: 'keyword' },
      },
    });
    expect(esClient.index).toHaveBeenCalled();
    expect(indexManagementClient.index).not.toHaveBeenCalled();
  });

  it('reconciles an existing legacy-version index when composition is enabled', async () => {
    const legacyVersion = getSchemaVersion(storageSettings);
    const composedVersion = getSchemaVersion(composedStorageSettings);
    const indexManagementClient = createMockEsClient();
    (esClient.indices.get as jest.Mock).mockResolvedValueOnce({
      'test_index-000001': {
        mappings: { _meta: { version: legacyVersion } },
        aliases: { test_index: { is_write_index: true } },
      },
    });
    (indexManagementClient.indices.simulateIndexTemplate as jest.Mock).mockResolvedValueOnce({
      template: {
        mappings: {
          _meta: { version: composedVersion },
          dynamic: 'strict',
          properties: {
            shared: { type: 'keyword' },
            foo: { type: 'keyword' },
          },
        },
      },
    });
    const adapter = new StorageIndexAdapter(esClient, loggerMock, composedStorageSettings, {
      indexManagementClient,
      isServerless: false,
    });

    await adapter
      .getClient()
      .search({ track_total_hits: false, size: 10, query: { match_all: {} } });

    expect(indexManagementClient.cluster.putComponentTemplate).toHaveBeenCalled();
    expect(indexManagementClient.indices.putIndexTemplate).toHaveBeenCalled();
    expect(indexManagementClient.indices.simulateIndexTemplate).toHaveBeenCalled();
    expect(esClient.indices.putMapping).toHaveBeenCalledWith(
      expect.objectContaining({
        index: 'test_index-000001',
        properties: {
          shared: { type: 'keyword' },
          foo: { type: 'keyword' },
        },
      })
    );
  });

  it('reconciles dependency changes with one deduplicated lookup per dependency', async () => {
    const existingVersion = getSchemaVersion(composedStorageSettings, [
      requiredDependencyV1,
      missingOptionalDependency,
    ]);
    const expectedVersion = getSchemaVersion(composedStorageSettings, [
      requiredDependencyV2,
      missingOptionalDependency,
    ]);
    const indexManagementClient = createMockEsClient();
    (indexManagementClient.cluster.getComponentTemplate as jest.Mock).mockImplementation(
      ({ name }) =>
        Promise.resolve({
          component_templates:
            name === requiredDependencyV2.name
              ? [
                  {
                    name: requiredDependencyV2.name,
                    component_template: requiredDependencyV2.componentTemplate,
                  },
                ]
              : [],
        })
    );
    (indexManagementClient.indices.simulateIndexTemplate as jest.Mock).mockResolvedValue({
      template: {
        mappings: {
          _meta: { version: expectedVersion },
          dynamic: 'strict',
          properties: {
            shared: { type: 'keyword' },
            sharedV2: { type: 'keyword' },
            foo: { type: 'keyword' },
          },
        },
      },
    });
    (esClient.indices.get as jest.Mock).mockResolvedValue({
      'test_index-000001': {
        mappings: { _meta: { version: existingVersion } },
        aliases: { test_index: { is_write_index: true } },
      },
    });
    const adapter = new StorageIndexAdapter(esClient, loggerMock, composedStorageSettings, {
      indexManagementClient,
      isServerless: false,
    });
    const client = adapter.getClient();

    await Promise.all([
      client.search({ track_total_hits: false, size: 10, query: { match_all: {} } }),
      client.search({ track_total_hits: false, size: 10, query: { match_all: {} } }),
    ]);

    expect(indexManagementClient.cluster.getComponentTemplate).toHaveBeenCalledTimes(2);
    expect(indexManagementClient.cluster.getComponentTemplate).toHaveBeenCalledWith({
      name: 'shared@mappings',
    });
    expect(indexManagementClient.cluster.getComponentTemplate).toHaveBeenCalledWith({
      name: 'test_index@custom',
    });
    expect(indexManagementClient.indices.simulateIndexTemplate).toHaveBeenCalledTimes(1);
    expect(esClient.indices.putMapping).toHaveBeenCalledWith(
      expect.objectContaining({
        index: 'test_index-000001',
        _meta: { version: expectedVersion },
      })
    );
  });

  it('does not simulate when the resolved dependency version matches the existing index', async () => {
    const expectedVersion = getSchemaVersion(composedStorageSettings, [
      requiredDependencyV2,
      missingOptionalDependency,
    ]);
    const indexManagementClient = createMockEsClient();
    (indexManagementClient.cluster.getComponentTemplate as jest.Mock).mockImplementation(
      ({ name }) =>
        Promise.resolve({
          component_templates:
            name === requiredDependencyV2.name
              ? [
                  {
                    name: requiredDependencyV2.name,
                    component_template: requiredDependencyV2.componentTemplate,
                  },
                ]
              : [],
        })
    );
    (esClient.indices.get as jest.Mock).mockResolvedValue({
      'test_index-000001': {
        mappings: { _meta: { version: expectedVersion } },
        aliases: { test_index: { is_write_index: true } },
      },
    });
    const adapter = new StorageIndexAdapter(esClient, loggerMock, composedStorageSettings, {
      indexManagementClient,
      isServerless: false,
    });

    await adapter
      .getClient()
      .search({ track_total_hits: false, size: 10, query: { match_all: {} } });

    expect(indexManagementClient.cluster.getComponentTemplate).toHaveBeenCalledTimes(2);
    expect(indexManagementClient.indices.simulateIndexTemplate).not.toHaveBeenCalled();
    expect(esClient.indices.putMapping).not.toHaveBeenCalled();
  });

  it('shares concurrent dependency resolution and mapping checks across adapters', async () => {
    const expectedVersion = getSchemaVersion(composedStorageSettings, [
      requiredDependencyV2,
      missingOptionalDependency,
    ]);
    const indexManagementClient = createMockEsClient();
    (indexManagementClient.cluster.getComponentTemplate as jest.Mock).mockImplementation(
      ({ name }) =>
        Promise.resolve({
          component_templates:
            name === requiredDependencyV2.name
              ? [
                  {
                    name: requiredDependencyV2.name,
                    component_template: requiredDependencyV2.componentTemplate,
                  },
                ]
              : [],
        })
    );
    (esClient.indices.get as jest.Mock).mockResolvedValue({
      'test_index-000001': {
        mappings: { _meta: { version: expectedVersion } },
        aliases: { test_index: { is_write_index: true } },
      },
    });
    const firstClient = new StorageIndexAdapter(esClient, loggerMock, composedStorageSettings, {
      indexManagementClient,
      isServerless: false,
    }).getClient();
    const secondClient = new StorageIndexAdapter(esClient, loggerMock, composedStorageSettings, {
      indexManagementClient,
      isServerless: false,
    }).getClient();

    await Promise.all([
      firstClient.search({ track_total_hits: false, size: 10, query: { match_all: {} } }),
      secondClient.search({ track_total_hits: false, size: 10, query: { match_all: {} } }),
    ]);

    expect(indexManagementClient.cluster.getComponentTemplate).toHaveBeenCalledTimes(2);
    expect(esClient.indices.get).toHaveBeenCalledTimes(1);
    expect(esClient.indices.getAlias).toHaveBeenCalledTimes(1);
    expect(indexManagementClient.indices.simulateIndexTemplate).not.toHaveBeenCalled();
  });

  it('reuses dependency and mapping checks until TTL expiry, then detects optional appearance', async () => {
    const missingOptionalVersion = getSchemaVersion(composedStorageSettings, [
      requiredDependencyV2,
      missingOptionalDependency,
    ]);
    const presentOptionalVersion = getSchemaVersion(composedStorageSettings, [
      requiredDependencyV2,
      presentOptionalDependency,
    ]);
    let now = 1_000;
    let optionalPresent = false;
    jest.spyOn(Date, 'now').mockImplementation(() => now);
    const indexManagementClient = createMockEsClient();
    (indexManagementClient.cluster.getComponentTemplate as jest.Mock).mockImplementation(
      ({ name }) =>
        Promise.resolve({
          component_templates:
            name === requiredDependencyV2.name
              ? [
                  {
                    name: requiredDependencyV2.name,
                    component_template: requiredDependencyV2.componentTemplate,
                  },
                ]
              : optionalPresent
              ? [
                  {
                    name: presentOptionalDependency.name,
                    component_template: presentOptionalDependency.componentTemplate,
                  },
                ]
              : [],
        })
    );
    (esClient.indices.get as jest.Mock).mockResolvedValue({
      'test_index-000001': {
        mappings: { _meta: { version: missingOptionalVersion } },
        aliases: { test_index: { is_write_index: true } },
      },
    });
    (indexManagementClient.indices.simulateIndexTemplate as jest.Mock).mockResolvedValue({
      template: {
        mappings: {
          _meta: { version: presentOptionalVersion },
          dynamic: 'strict',
          properties: {
            shared: { type: 'keyword' },
            sharedV2: { type: 'keyword' },
            foo: { type: 'keyword' },
            optional: { type: 'keyword' },
          },
        },
      },
    });
    const createClient = () =>
      new StorageIndexAdapter(esClient, loggerMock, composedStorageSettings, {
        indexManagementClient,
        isServerless: false,
      }).getClient();

    await createClient().search({
      track_total_hits: false,
      size: 10,
      query: { match_all: {} },
    });
    optionalPresent = true;
    now += 29_999;
    await createClient().search({
      track_total_hits: false,
      size: 10,
      query: { match_all: {} },
    });

    expect(indexManagementClient.cluster.getComponentTemplate).toHaveBeenCalledTimes(2);
    expect(esClient.indices.get).toHaveBeenCalledTimes(1);
    expect(indexManagementClient.indices.simulateIndexTemplate).not.toHaveBeenCalled();

    now += 2;
    await createClient().search({
      track_total_hits: false,
      size: 10,
      query: { match_all: {} },
    });

    expect(indexManagementClient.cluster.getComponentTemplate).toHaveBeenCalledTimes(4);
    expect(esClient.indices.get).toHaveBeenCalledTimes(2);
    expect(indexManagementClient.indices.simulateIndexTemplate).toHaveBeenCalledTimes(1);
    expect(esClient.indices.putMapping).toHaveBeenCalledWith(
      expect.objectContaining({
        _meta: { version: presentOptionalVersion },
        properties: expect.objectContaining({
          optional: { type: 'keyword' },
        }),
      })
    );
  });

  it('evicts failed shared dependency resolutions so later adapters can retry', async () => {
    const expectedVersion = getSchemaVersion(composedStorageSettings, [
      requiredDependencyV2,
      missingOptionalDependency,
    ]);
    const indexManagementClient = createMockEsClient();
    let rejectRequired = true;
    (indexManagementClient.cluster.getComponentTemplate as jest.Mock).mockImplementation(
      ({ name }) => {
        if (name === requiredDependencyV2.name && rejectRequired) {
          rejectRequired = false;
          return Promise.reject(new Error('dependency lookup failed'));
        }
        return Promise.resolve({
          component_templates:
            name === requiredDependencyV2.name
              ? [
                  {
                    name: requiredDependencyV2.name,
                    component_template: requiredDependencyV2.componentTemplate,
                  },
                ]
              : [],
        });
      }
    );
    (esClient.indices.get as jest.Mock).mockResolvedValue({
      'test_index-000001': {
        mappings: { _meta: { version: expectedVersion } },
        aliases: { test_index: { is_write_index: true } },
      },
    });
    const createClient = () =>
      new StorageIndexAdapter(esClient, loggerMock, composedStorageSettings, {
        indexManagementClient,
        isServerless: false,
      }).getClient();

    const failedResults = await Promise.allSettled([
      createClient().search({ track_total_hits: false, size: 10, query: { match_all: {} } }),
      createClient().search({ track_total_hits: false, size: 10, query: { match_all: {} } }),
    ]);

    expect(failedResults.map(({ status }) => status)).toEqual(['rejected', 'rejected']);
    expect(indexManagementClient.cluster.getComponentTemplate).toHaveBeenCalledTimes(2);

    await expect(
      createClient().search({ track_total_hits: false, size: 10, query: { match_all: {} } })
    ).resolves.toBeDefined();
    expect(indexManagementClient.cluster.getComponentTemplate).toHaveBeenCalledTimes(4);
  });

  it('cleans only the plugin-owned component template and remains idempotent', async () => {
    const indexManagementClient = createMockEsClient();
    const adapter = new StorageIndexAdapter(esClient, loggerMock, composedStorageSettings, {
      indexManagementClient,
      isServerless: false,
    });
    const client = adapter.getClient();
    await client.index({ id: 'doc1', document: { foo: 'bar' } });

    (esClient.indices.get as jest.Mock).mockReset();
    (esClient.indices.get as jest.Mock)
      .mockResolvedValueOnce({
        'test_index-000001': {
          mappings: { _meta: { version: 'current' } },
          aliases: { test_index: { is_write_index: true } },
        },
      })
      .mockResolvedValue({});
    (indexManagementClient.indices.getIndexTemplate as jest.Mock).mockReset();
    (indexManagementClient.indices.getIndexTemplate as jest.Mock)
      .mockResolvedValueOnce({
        index_templates: [{ index_template: { _meta: { version: 'current' } } }],
      })
      .mockResolvedValue({ index_templates: [] });
    (indexManagementClient.cluster.getComponentTemplate as jest.Mock).mockReset();
    (indexManagementClient.cluster.getComponentTemplate as jest.Mock)
      .mockResolvedValueOnce({
        component_templates: [
          {
            name: 'test_index@mappings',
            component_template: { template: {} },
          },
        ],
      })
      .mockResolvedValue({ component_templates: [] });

    await expect(client.clean()).resolves.toEqual({ acknowledged: true, result: 'deleted' });
    await expect(client.clean()).resolves.toEqual({ acknowledged: true, result: 'noop' });

    expect(indexManagementClient.cluster.deleteComponentTemplate).toHaveBeenCalledTimes(1);
    expect(indexManagementClient.cluster.deleteComponentTemplate).toHaveBeenCalledWith({
      name: 'test_index@mappings',
    });
    expect(indexManagementClient.cluster.deleteComponentTemplate).not.toHaveBeenCalledWith({
      name: 'shared@mappings',
    });
    expect(indexManagementClient.cluster.deleteComponentTemplate).not.toHaveBeenCalledWith({
      name: 'test_index@custom',
    });
    expect(
      (indexManagementClient.indices.deleteIndexTemplate as jest.Mock).mock.invocationCallOrder[0]
    ).toBeLessThan(
      (indexManagementClient.cluster.deleteComponentTemplate as jest.Mock).mock
        .invocationCallOrder[0]
    );
  });

  it('uses a separate index management client for template operations', async () => {
    const indexManagementClient = createMockEsClient();
    (esClient.indices.get as jest.Mock).mockResolvedValueOnce({
      'test_index-000001': {
        mappings: { _meta: { version: 'outdated' } },
        aliases: { test_index: { is_write_index: true } },
      },
    });
    const adapter = new StorageIndexAdapter(esClient, loggerMock, storageSettings, {
      indexManagementClient,
      isServerless: false,
    });
    const client = adapter.getClient();

    await client.index({ id: 'doc1', document: { foo: 'bar' } });
    await client.clean();

    expect(indexManagementClient.indices.putIndexTemplate).toHaveBeenCalled();
    expect(indexManagementClient.indices.simulateIndexTemplate).toHaveBeenCalled();
    expect(indexManagementClient.indices.getIndexTemplate).toHaveBeenCalled();
    expect(indexManagementClient.indices.deleteIndexTemplate).toHaveBeenCalled();
    expect(esClient.indices.putIndexTemplate).not.toHaveBeenCalled();
    expect(esClient.indices.simulateIndexTemplate).not.toHaveBeenCalled();
    expect(esClient.indices.getIndexTemplate).not.toHaveBeenCalled();
    expect(esClient.indices.deleteIndexTemplate).not.toHaveBeenCalled();
    expect(esClient.indices.putMapping).toHaveBeenCalled();
    expect(esClient.indices.delete).toHaveBeenCalledWith({ index: 'test_index-000001' });
    expect(esClient.index).toHaveBeenCalled();
    expect(indexManagementClient.indices.get).not.toHaveBeenCalled();
    expect(indexManagementClient.indices.getAlias).not.toHaveBeenCalled();
    expect(indexManagementClient.indices.create).not.toHaveBeenCalled();
    expect(indexManagementClient.indices.putMapping).not.toHaveBeenCalled();
    expect(indexManagementClient.indices.delete).not.toHaveBeenCalled();
    expect(indexManagementClient.index).not.toHaveBeenCalled();
    expect(indexManagementClient.bulk).not.toHaveBeenCalled();
    expect(indexManagementClient.search).not.toHaveBeenCalled();
    expect(indexManagementClient.delete).not.toHaveBeenCalled();
  });

  it('uses the primary client to create the backing index', async () => {
    const indexManagementClient = createMockEsClient();
    (esClient.indices.getAlias as jest.Mock).mockResolvedValue({});
    (esClient.indices.get as jest.Mock).mockResolvedValue({});
    const adapter = new StorageIndexAdapter(esClient, loggerMock, storageSettings, {
      indexManagementClient,
      isServerless: false,
    });

    await adapter.getClient().index({ id: 'doc1', document: { foo: 'bar' } });

    expect(esClient.indices.create).toHaveBeenCalledWith({ index: 'test_index-000001' });
    expect(esClient.index).toHaveBeenCalled();
    expect(indexManagementClient.indices.create).not.toHaveBeenCalled();
    expect(indexManagementClient.index).not.toHaveBeenCalled();
  });

  it('forwards priority to the index template when set', async () => {
    const adapter = new StorageIndexAdapter(
      esClient,
      loggerMock,
      { ...storageSettings, priority: 600 },
      { isServerless: true }
    );
    const client = adapter.getClient();

    await client.index({ id: 'doc1', document: { foo: 'bar' } });

    expect(esClient.indices.putIndexTemplate).toHaveBeenCalledWith(
      expect.objectContaining({ priority: 600 })
    );
  });

  it('omits priority from the index template when unset', async () => {
    const adapter = new StorageIndexAdapter(esClient, loggerMock, storageSettings, {
      isServerless: true,
    });
    const client = adapter.getClient();

    await client.index({ id: 'doc1', document: { foo: 'bar' } });

    expect(esClient.indices.putIndexTemplate).toHaveBeenCalledWith(
      expect.not.objectContaining({ priority: expect.anything() })
    );
  });

  it('omits index template settings when isServerless option is true', async () => {
    const adapter = new StorageIndexAdapter(esClient, loggerMock, storageSettings, {
      isServerless: true,
    });
    const client = adapter.getClient();

    await client.index({ id: 'doc1', document: { foo: 'bar' } });

    expect(esClient.indices.putIndexTemplate).toHaveBeenCalledWith(
      expect.objectContaining({
        template: expect.not.objectContaining({ settings: expect.anything() }),
      })
    );
  });

  it('includes index template settings when isServerless option is false', async () => {
    const adapter = new StorageIndexAdapter(esClient, loggerMock, storageSettings, {
      isServerless: false,
    });
    const client = adapter.getClient();

    await client.index({ id: 'doc1', document: { foo: 'bar' } });

    expect(esClient.indices.putIndexTemplate).toHaveBeenCalledWith(
      expect.objectContaining({
        template: expect.objectContaining({
          settings: expect.objectContaining({ auto_expand_replicas: '0-1' }),
        }),
      })
    );
  });

  it('omits settings when info() reports serverless and isServerless is not provided', async () => {
    (esClient.info as jest.Mock).mockResolvedValue({
      version: { build_flavor: 'serverless' },
    });

    const adapter = new StorageIndexAdapter(esClient, loggerMock, storageSettings);
    const client = adapter.getClient();

    await client.index({ id: 'doc1', document: { foo: 'bar' } });

    expect(esClient.info).toHaveBeenCalledTimes(1);
    expect(esClient.indices.putIndexTemplate).toHaveBeenCalledWith(
      expect.objectContaining({
        template: expect.not.objectContaining({ settings: expect.anything() }),
      })
    );
  });

  it('does not call info() when isServerless option is provided', async () => {
    const adapter = new StorageIndexAdapter(esClient, loggerMock, storageSettings, {
      isServerless: true,
    });
    const client = adapter.getClient();

    await client.index({ id: 'doc1', document: { foo: 'bar' } });

    expect(esClient.info).not.toHaveBeenCalled();
  });

  it('retries without settings when both info() and isServerless are unavailable', async () => {
    (esClient.info as jest.Mock).mockRejectedValue(new Error('forbidden'));

    const serverlessError = new errors.ResponseError({
      statusCode: 400,
      headers: {},
      warnings: [],
      meta: {} as TransportResult['meta'],
      body: {
        error: {
          type: 'illegal_argument_exception',
          reason:
            'Settings [index.auto_expand_replicas,index.number_of_shards] are not available when running in serverless mode',
        },
      },
    } as TransportResult);
    (esClient.indices.putIndexTemplate as jest.Mock).mockRejectedValueOnce(serverlessError);

    const adapter = new StorageIndexAdapter(esClient, loggerMock, storageSettings);
    const client = adapter.getClient();

    await client.index({ id: 'doc1', document: { foo: 'bar' } });

    expect(esClient.indices.putIndexTemplate).toHaveBeenCalledTimes(2);
    expect(esClient.indices.putIndexTemplate).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        template: expect.objectContaining({
          settings: expect.objectContaining({ auto_expand_replicas: '0-1' }),
        }),
      })
    );
    expect(esClient.indices.putIndexTemplate).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        template: expect.not.objectContaining({ settings: expect.anything() }),
      })
    );
  });

  it('skips settings on subsequent writes after reactive serverless detection', async () => {
    (esClient.info as jest.Mock).mockRejectedValue(new Error('forbidden'));

    const serverlessError = new errors.ResponseError({
      statusCode: 400,
      headers: {},
      warnings: [],
      meta: {} as TransportResult['meta'],
      body: {
        error: {
          type: 'illegal_argument_exception',
          reason:
            'Settings [index.auto_expand_replicas,index.number_of_shards] are not available when running in serverless mode',
        },
      },
    } as TransportResult);
    (esClient.indices.putIndexTemplate as jest.Mock).mockRejectedValueOnce(serverlessError);

    const adapter = new StorageIndexAdapter(esClient, loggerMock, storageSettings);
    const client = adapter.getClient();

    await client.index({ id: 'doc1', document: { foo: 'bar' } });
    await client.index({ id: 'doc2', document: { foo: 'baz' } });

    expect(esClient.indices.putIndexTemplate).toHaveBeenCalledTimes(3);
    expect(esClient.indices.putIndexTemplate).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        template: expect.not.objectContaining({ settings: expect.anything() }),
      })
    );
  });

  it('works without transport options (backward compatible)', async () => {
    const adapter = new StorageIndexAdapter(esClient, loggerMock, storageSettings);
    const client = adapter.getClient();

    await client.search({ track_total_hits: false, size: 10, query: { match_all: {} } });

    expect(esClient.search).toHaveBeenCalledWith(expect.objectContaining({ index: 'test_index' }));
  });

  it('forwards transport options to esClient.bulk for create operations', async () => {
    esClient.bulk.mockResolvedValueOnce({
      errors: false,
      items: [{ create: { _id: 'doc1', result: 'created', status: 201, _index: 'test_index' } }],
      took: 1,
    });
    const adapter = new StorageIndexAdapter(esClient, loggerMock, storageSettings);
    const client = adapter.getClient();

    await client.bulk(
      {
        operations: [{ create: { _id: 'doc1', document: { foo: 'bar' } } }],
      },
      transportOptions
    );

    expect(esClient.bulk).toHaveBeenCalledWith(
      expect.objectContaining({
        require_alias: true,
        operations: [{ create: { _id: 'doc1' } }, { foo: 'bar' }],
      }),
      transportOptions
    );
  });
});

describe('StorageIndexAdapter - esql method', () => {
  let esClient: jest.Mocked<ElasticsearchClient>;
  let esqlQuery: jest.Mock;
  let loggerMock: jest.Mocked<Logger>;

  const mockEsqlResponse = {
    columns: [{ name: 'foo', type: 'keyword' }],
    values: [['bar']],
  };

  beforeEach(() => {
    esClient = createMockEsClient();
    esqlQuery = jest.fn().mockResolvedValue(mockEsqlResponse);
    addEsqlQueryMock(esClient, esqlQuery);
    loggerMock = createLoggerMock();
  });

  it('renders FROM + caller pipeline and returns the ES|QL response', async () => {
    const adapter = new StorageIndexAdapter(esClient, loggerMock, storageSettings);
    const client = adapter.getClient();

    const result = await client.esql({ pipeline: esql`LIMIT 1` });

    expect(esqlQuery).toHaveBeenCalledWith(
      expect.objectContaining({ query: 'FROM test_index | LIMIT 1', format: 'json' })
    );
    expect(result).toEqual(mockEsqlResponse);
  });

  it('emits a METADATA clause when metadata is provided', async () => {
    const adapter = new StorageIndexAdapter(esClient, loggerMock, storageSettings);
    const client = adapter.getClient();

    await client.esql({ metadata: ['_id', '_source'], pipeline: esql`LIMIT 1` });

    expect(esqlQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        query: 'FROM test_index METADATA _id, _source | LIMIT 1',
      })
    );
  });

  it('forwards param-hole values from the pipeline ComposerQuery to esClient.esql.query', async () => {
    const adapter = new StorageIndexAdapter(esClient, loggerMock, storageSettings);
    const client = adapter.getClient();

    const searchTerm = '*foo*';
    await client.esql({ pipeline: esql`WHERE foo LIKE ${{ searchTerm }} | LIMIT 5` });

    expect(esqlQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        query: expect.stringContaining('?searchTerm'),
        params: expect.arrayContaining([{ searchTerm: '*foo*' }]),
      })
    );
  });

  it('returns empty response when the storage index does not exist (404 path)', async () => {
    const notFoundError = new errors.ResponseError({
      statusCode: 404,
      headers: {},
      warnings: [],
      meta: {} as TransportResult['meta'],
      body: { error: { type: 'index_not_found_exception', reason: 'no such index' } },
    } as TransportResult);
    esqlQuery.mockRejectedValueOnce(notFoundError);

    const adapter = new StorageIndexAdapter(esClient, loggerMock, storageSettings);
    const client = adapter.getClient();

    const result = await client.esql({ pipeline: esql`LIMIT 1` });

    expect(result).toEqual({ columns: [], values: [] });
  });

  it('returns empty response for 400 verification_exception with Unknown index', async () => {
    const unknownIndexError = new errors.ResponseError({
      statusCode: 400,
      headers: {},
      warnings: [],
      meta: {} as TransportResult['meta'],
      body: {
        error: { type: 'verification_exception', reason: 'Unknown index [test_index]' },
      },
    } as TransportResult);
    esqlQuery.mockRejectedValueOnce(unknownIndexError);

    const adapter = new StorageIndexAdapter(esClient, loggerMock, storageSettings);
    const client = adapter.getClient();

    const result = await client.esql({ pipeline: esql`LIMIT 1` });
    expect(result).toEqual({ columns: [], values: [] });
  });

  it('prepends SET options before the FROM clause when setOptions is provided', async () => {
    const adapter = new StorageIndexAdapter(esClient, loggerMock, storageSettings);
    const client = adapter.getClient();

    await client.esql({ pipeline: esql`LIMIT 1`, setOptions: { unmapped_fields: 'LOAD' } });

    expect(esqlQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        query: expect.stringMatching(/^SET unmapped_fields = "LOAD".*FROM test_index.*LIMIT 1$/s),
      })
    );
  });

  it('throws a clear error when the pipeline starts with a FROM clause', async () => {
    const adapter = new StorageIndexAdapter(esClient, loggerMock, storageSettings);
    const client = adapter.getClient();

    await expect(client.esql({ pipeline: esql`FROM other_index | LIMIT 1` })).rejects.toThrow(
      /pipeline must not start with a FROM clause/
    );

    expect(esqlQuery).not.toHaveBeenCalled();
  });

  it('rethrows non-404 errors (verification_exception, etc.)', async () => {
    const verificationError = new errors.ResponseError({
      statusCode: 400,
      headers: {},
      warnings: [],
      meta: {} as TransportResult['meta'],
      body: {
        error: { type: 'verification_exception', reason: 'Unknown column [foo]' },
      },
    } as TransportResult);
    esqlQuery.mockRejectedValueOnce(verificationError);

    const adapter = new StorageIndexAdapter(esClient, loggerMock, storageSettings);
    const client = adapter.getClient();

    await expect(client.esql({ pipeline: esql`LIMIT 1` })).rejects.toThrow(
      'verification_exception'
    );
  });

  it('applies migrateSource to _source column when metadata includes _source', async () => {
    const rawSource = { foo: 'bar', version: 0 };
    const migratedSource = { foo: 'bar', version: 1 };
    esqlQuery.mockResolvedValueOnce({
      columns: [
        { name: '_source', type: 'unsupported' },
        { name: 'foo', type: 'keyword' },
      ],
      values: [[rawSource, 'bar']],
    });

    const migrateSource = jest.fn().mockReturnValue(migratedSource);
    const adapter = new StorageIndexAdapter(esClient, loggerMock, storageSettings, {
      migrateSource,
    });
    const client = adapter.getClient();

    const result = await client.esql({ metadata: ['_source'], pipeline: esql`LIMIT 1` });

    expect(migrateSource).toHaveBeenCalledWith(rawSource);
    expect(result.values[0][0]).toEqual(migratedSource);
  });

  it('skips migrateSource when metadata does not include _source (even with migrateSource configured)', async () => {
    const rawSource = { foo: 'bar', version: 0 };
    esqlQuery.mockResolvedValueOnce({
      columns: [{ name: '_source', type: 'unsupported' }],
      values: [[rawSource]],
    });

    const migrateSource = jest.fn().mockReturnValue({ foo: 'bar', version: 1 });
    const adapter = new StorageIndexAdapter(esClient, loggerMock, storageSettings, {
      migrateSource,
    });
    const client = adapter.getClient();

    // metadata omitted — even if a `_source` column shows up in the response,
    // the adapter must not touch it (caller did not opt in).
    await client.esql({ pipeline: esql`LIMIT 1` });

    expect(migrateSource).not.toHaveBeenCalled();
  });

  it('skips migrateSource when migrateSource: false is passed', async () => {
    const rawSource = { foo: 'bar', version: 0 };
    esqlQuery.mockResolvedValueOnce({
      columns: [{ name: '_source', type: 'unsupported' }],
      values: [[rawSource]],
    });

    const migrateSource = jest.fn().mockReturnValue({ foo: 'bar', version: 1 });
    const adapter = new StorageIndexAdapter(esClient, loggerMock, storageSettings, {
      migrateSource,
    });
    const client = adapter.getClient();

    const result = await client.esql({
      metadata: ['_source'],
      pipeline: esql`LIMIT 1`,
      migrateSource: false,
    });

    expect(migrateSource).not.toHaveBeenCalled();
    expect(result.values[0][0]).toEqual(rawSource);
  });

  it('forwards filter and transport options to esClient.esql.query', async () => {
    const adapter = new StorageIndexAdapter(esClient, loggerMock, storageSettings);
    const client = adapter.getClient();

    const filter = {
      bool: { filter: [{ range: { '@timestamp': { gte: 'now-1h' } } }] },
    };
    const transportOptions: StorageTransportOptions = {
      maxResponseSize: 50 * 1024 * 1024,
      requestTimeout: 30_000,
    };
    await client.esql({ pipeline: esql`LIMIT 5`, filter }, transportOptions);

    expect(esqlQuery).toHaveBeenCalledWith(expect.objectContaining({ filter }), transportOptions);
  });

  it('awaits ensureMappingsBeforeReading before issuing the ES|QL query', async () => {
    // Defer the alias lookup that updateMappingsIfNeeded awaits so the
    // ensureMappingsBeforeReading promise stays pending until we release it.
    let releaseGetAlias!: () => void;
    const getAliasPromise = new Promise<{
      'test_index-000001': { aliases: { test_index: { is_write_index: true } } };
    }>((resolve) => {
      releaseGetAlias = () =>
        resolve({
          'test_index-000001': { aliases: { test_index: { is_write_index: true } } },
        });
    });
    (esClient.indices.getAlias as jest.Mock).mockReturnValueOnce(getAliasPromise);

    const adapter = new StorageIndexAdapter(esClient, loggerMock, storageSettings);
    const client = adapter.getClient();

    const esqlPromise = client.esql({ pipeline: esql`LIMIT 1` });

    // Microtask flush; the adapter should still be waiting on the alias lookup,
    // so esql.query must not have been issued yet.
    await Promise.resolve();
    await Promise.resolve();
    expect(esqlQuery).not.toHaveBeenCalled();

    releaseGetAlias();
    await esqlPromise;

    expect(esqlQuery).toHaveBeenCalledTimes(1);
  });
});
