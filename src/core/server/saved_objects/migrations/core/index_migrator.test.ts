/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import _ from 'lodash';
import { elasticsearchClientMock } from '../../../elasticsearch/client/mocks';
import { SavedObjectUnsanitizedDoc, SavedObjectsSerializer } from '../../serialization';
import { SavedObjectTypeRegistry } from '../../saved_objects_type_registry';
import { IndexMigrator } from './index_migrator';
import { MigrationOpts } from './migration_context';
import { loggingSystemMock } from '../../../logging/logging_system.mock';

describe('IndexMigrator', () => {
  let testOpts: jest.Mocked<MigrationOpts> & {
    client: ReturnType<typeof elasticsearchClientMock.createElasticsearchClient>;
  };

  beforeEach(() => {
    testOpts = {
      batchSize: 10,
      client: elasticsearchClientMock.createElasticsearchClient(),
      index: '.kibana',
      log: loggingSystemMock.create().get(),
      mappingProperties: {},
      pollInterval: 1,
      scrollDuration: '1m',
      documentMigrator: {
        migrationVersion: {},
        migrate: _.identity,
      },
      serializer: new SavedObjectsSerializer(new SavedObjectTypeRegistry()),
    };
  });

  test('creates the index if it does not exist', async () => {
    const { client } = testOpts;

    testOpts.mappingProperties = { foo: { type: 'long' } as any };

    withIndex(client, { index: { statusCode: 404 }, alias: { statusCode: 404 } });

    await new IndexMigrator(testOpts).migrate();

    expect(client.indices.create).toHaveBeenCalledWith({
      body: {
        mappings: {
          dynamic: 'strict',
          _meta: {
            migrationMappingPropertyHashes: {
              foo: '18c78c995965207ed3f6e7fc5c6e55fe',
              migrationVersion: '4a1746014a75ade3a714e1db5763276f',
              namespace: '2f4316de49999235636386fe51dc06c1',
              namespaces: '2f4316de49999235636386fe51dc06c1',
              originId: '2f4316de49999235636386fe51dc06c1',
              references: '7997cf5a56cc02bdc9c93361bde732b0',
              type: '2f4316de49999235636386fe51dc06c1',
              updated_at: '00da57df13e94e9d98437d13ace4bfe0',
            },
          },
          properties: {
            foo: { type: 'long' },
            migrationVersion: { dynamic: 'true', type: 'object' },
            namespace: { type: 'keyword' },
            namespaces: { type: 'keyword' },
            originId: { type: 'keyword' },
            type: { type: 'keyword' },
            updated_at: { type: 'date' },
            references: {
              type: 'nested',
              properties: {
                name: { type: 'keyword' },
                type: { type: 'keyword' },
                id: { type: 'keyword' },
              },
            },
          },
        },
        settings: { number_of_shards: 1, auto_expand_replicas: '0-1' },
      },
      index: '.kibana_1',
    });
  });

  test('returns stats about the migration', async () => {
    const { client } = testOpts;

    withIndex(client, { index: { statusCode: 404 }, alias: { statusCode: 404 } });

    const result = await new IndexMigrator(testOpts).migrate();

    expect(result).toMatchObject({
      destIndex: '.kibana_1',
      sourceIndex: '.kibana',
      status: 'migrated',
    });
  });

  test('fails if there are multiple root doc types', async () => {
    const { client } = testOpts;

    withIndex(client, {
      index: {
        '.kibana_1': {
          aliases: {},
          mappings: {
            foo: { properties: {} },
            doc: {
              properties: {
                author: { type: 'text' },
              },
            },
          },
        },
      },
    });

    await expect(new IndexMigrator(testOpts).migrate()).rejects.toThrow(
      /use the X-Pack upgrade assistant/
    );
  });

  test('fails if root doc type is not "doc"', async () => {
    const { client } = testOpts;

    withIndex(client, {
      index: {
        '.kibana_1': {
          aliases: {},
          mappings: {
            poc: {
              properties: {
                author: { type: 'text' },
              },
            },
          },
        },
      },
    });

    await expect(new IndexMigrator(testOpts).migrate()).rejects.toThrow(
      /use the X-Pack upgrade assistant/
    );
  });

  test('retains unknown core field mappings from the previous index', async () => {
    const { client } = testOpts;

    testOpts.mappingProperties = { foo: { type: 'text' } as any };

    withIndex(client, {
      index: {
        '.kibana_1': {
          aliases: {},
          mappings: {
            properties: {
              unknown_core_field: { type: 'text' },
            },
          },
        },
      },
    });

    await new IndexMigrator(testOpts).migrate();

    expect(client.indices.create).toHaveBeenCalledWith({
      body: {
        mappings: {
          dynamic: 'strict',
          _meta: {
            migrationMappingPropertyHashes: {
              foo: '625b32086eb1d1203564cf85062dd22e',
              migrationVersion: '4a1746014a75ade3a714e1db5763276f',
              namespace: '2f4316de49999235636386fe51dc06c1',
              namespaces: '2f4316de49999235636386fe51dc06c1',
              originId: '2f4316de49999235636386fe51dc06c1',
              references: '7997cf5a56cc02bdc9c93361bde732b0',
              type: '2f4316de49999235636386fe51dc06c1',
              updated_at: '00da57df13e94e9d98437d13ace4bfe0',
            },
          },
          properties: {
            unknown_core_field: { type: 'text' },
            foo: { type: 'text' },
            migrationVersion: { dynamic: 'true', type: 'object' },
            namespace: { type: 'keyword' },
            namespaces: { type: 'keyword' },
            originId: { type: 'keyword' },
            type: { type: 'keyword' },
            updated_at: { type: 'date' },
            references: {
              type: 'nested',
              properties: {
                name: { type: 'keyword' },
                type: { type: 'keyword' },
                id: { type: 'keyword' },
              },
            },
          },
        },
        settings: { number_of_shards: 1, auto_expand_replicas: '0-1' },
      },
      index: '.kibana_2',
    });
  });

  test('disables complex field mappings from unknown types in the previous index', async () => {
    const { client } = testOpts;

    testOpts.mappingProperties = { foo: { type: 'text' } as any };

    withIndex(client, {
      index: {
        '.kibana_1': {
          aliases: {},
          mappings: {
            properties: {
              unknown_complex_field: { properties: { description: { type: 'text' } } },
            },
          },
        },
      },
    });

    await new IndexMigrator(testOpts).migrate();

    expect(client.indices.create).toHaveBeenCalledWith({
      body: {
        mappings: {
          dynamic: 'strict',
          _meta: {
            migrationMappingPropertyHashes: {
              foo: '625b32086eb1d1203564cf85062dd22e',
              migrationVersion: '4a1746014a75ade3a714e1db5763276f',
              namespace: '2f4316de49999235636386fe51dc06c1',
              namespaces: '2f4316de49999235636386fe51dc06c1',
              originId: '2f4316de49999235636386fe51dc06c1',
              references: '7997cf5a56cc02bdc9c93361bde732b0',
              type: '2f4316de49999235636386fe51dc06c1',
              updated_at: '00da57df13e94e9d98437d13ace4bfe0',
            },
          },
          properties: {
            unknown_complex_field: { dynamic: false, properties: {} },
            foo: { type: 'text' },
            migrationVersion: { dynamic: 'true', type: 'object' },
            namespace: { type: 'keyword' },
            namespaces: { type: 'keyword' },
            originId: { type: 'keyword' },
            type: { type: 'keyword' },
            updated_at: { type: 'date' },
            references: {
              type: 'nested',
              properties: {
                name: { type: 'keyword' },
                type: { type: 'keyword' },
                id: { type: 'keyword' },
              },
            },
          },
        },
        settings: { number_of_shards: 1, auto_expand_replicas: '0-1' },
      },
      index: '.kibana_2',
    });
  });

  test('points the alias at the dest index', async () => {
    const { client } = testOpts;

    withIndex(client, { index: { statusCode: 404 }, alias: { statusCode: 404 } });

    await new IndexMigrator(testOpts).migrate();

    expect(client.indices.create).toHaveBeenCalledWith(expect.any(Object));
    expect(client.indices.updateAliases).toHaveBeenCalledWith({
      body: { actions: [{ add: { alias: '.kibana', index: '.kibana_1' } }] },
    });
  });

  test('removes previous indices from the alias', async () => {
    const { client } = testOpts;

    testOpts.documentMigrator.migrationVersion = {
      dashboard: '2.4.5',
    };

    withIndex(client, { numOutOfDate: 1 });

    await new IndexMigrator(testOpts).migrate();

    expect(client.indices.create).toHaveBeenCalledWith(expect.any(Object));
    expect(client.indices.updateAliases).toHaveBeenCalledWith({
      body: {
        actions: [
          { remove: { alias: '.kibana', index: '.kibana_1' } },
          { add: { alias: '.kibana', index: '.kibana_2' } },
        ],
      },
    });
  });

  test('transforms all docs from the original index', async () => {
    let count = 0;
    const { client } = testOpts;
    const migrateDoc = jest.fn((doc: SavedObjectUnsanitizedDoc) => {
      return {
        ...doc,
        attributes: { name: ++count },
      };
    });

    testOpts.documentMigrator = {
      migrationVersion: { foo: '1.2.3' },
      migrate: migrateDoc,
    };

    withIndex(client, {
      numOutOfDate: 1,
      docs: [
        [{ _id: 'foo:1', _source: { type: 'foo', foo: { name: 'Bar' } } }],
        [{ _id: 'foo:2', _source: { type: 'foo', foo: { name: 'Baz' } } }],
      ],
    });

    await new IndexMigrator(testOpts).migrate();

    expect(count).toEqual(2);
    expect(migrateDoc).toHaveBeenCalledWith({
      id: '1',
      type: 'foo',
      attributes: { name: 'Bar' },
      migrationVersion: {},
      references: [],
    });
    expect(migrateDoc).toHaveBeenCalledWith({
      id: '2',
      type: 'foo',
      attributes: { name: 'Baz' },
      migrationVersion: {},
      references: [],
    });

    expect(client.bulk).toHaveBeenCalledTimes(2);
    expect(client.bulk).toHaveBeenNthCalledWith(1, {
      body: [
        { index: { _id: 'foo:1', _index: '.kibana_2' } },
        { foo: { name: 1 }, type: 'foo', migrationVersion: {}, references: [] },
      ],
    });
    expect(client.bulk).toHaveBeenNthCalledWith(2, {
      body: [
        { index: { _id: 'foo:2', _index: '.kibana_2' } },
        { foo: { name: 2 }, type: 'foo', migrationVersion: {}, references: [] },
      ],
    });
  });
});

function withIndex(
  client: ReturnType<typeof elasticsearchClientMock.createElasticsearchClient>,
  opts: any = {}
) {
  const defaultIndex = {
    '.kibana_1': {
      aliases: { '.kibana': {} },
      mappings: {
        dynamic: 'strict',
        properties: {
          migrationVersion: { dynamic: 'true', type: 'object' },
        },
      },
    },
  };
  const defaultAlias = {
    '.kibana_1': {},
  };
  const { numOutOfDate = 0 } = opts;
  const { alias = defaultAlias } = opts;
  const { index = defaultIndex } = opts;
  const { docs = [] } = opts;
  const searchResult = (i: number) => ({
    _scroll_id: i,
    _shards: {
      successful: 1,
      total: 1,
    },
    hits: {
      hits: docs[i] || [],
    },
  });

  let scrollCallCounter = 1;

  client.indices.get.mockReturnValue(
    elasticsearchClientMock.createSuccessTransportRequestPromise(index, {
      statusCode: index.statusCode,
    })
  );
  client.indices.getAlias.mockReturnValue(
    elasticsearchClientMock.createSuccessTransportRequestPromise(alias, {
      statusCode: index.statusCode,
    })
  );
  client.reindex.mockReturnValue(
    elasticsearchClientMock.createSuccessTransportRequestPromise({
      task: 'zeid',
      _shards: { successful: 1, total: 1 },
    })
  );
  client.tasks.get.mockReturnValue(
    elasticsearchClientMock.createSuccessTransportRequestPromise({ completed: true })
  );
  client.search.mockReturnValue(
    elasticsearchClientMock.createSuccessTransportRequestPromise(searchResult(0))
  );
  client.bulk.mockReturnValue(
    elasticsearchClientMock.createSuccessTransportRequestPromise({ items: [] })
  );
  client.count.mockReturnValue(
    elasticsearchClientMock.createSuccessTransportRequestPromise({
      count: numOutOfDate,
      _shards: { successful: 1, total: 1 },
    })
  );
  client.scroll.mockImplementation(() => {
    if (scrollCallCounter <= docs.length) {
      const result = searchResult(scrollCallCounter);
      scrollCallCounter++;
      return elasticsearchClientMock.createSuccessTransportRequestPromise(result);
    }
    return elasticsearchClientMock.createSuccessTransportRequestPromise({});
  });
}
