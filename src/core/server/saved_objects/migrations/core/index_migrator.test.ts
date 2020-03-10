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
import { SavedObjectUnsanitizedDoc, SavedObjectsSerializer } from '../../serialization';
import { SavedObjectTypeRegistry } from '../../saved_objects_type_registry';
import { IndexMigrator, migrateIndex } from './index_migrator';
import { loggingServiceMock } from '../../../logging/logging_service.mock';

describe('IndexMigrator', () => {
  let testOpts: any;

  beforeEach(() => {
    testOpts = {
      batchSize: 10,
      callCluster: jest.fn(),
      dryRun: false,
      index: '.kibana',
      log: loggingServiceMock.create().get(),
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
    const { callCluster } = testOpts;

    testOpts.mappingProperties = { foo: { properties: { title: { type: 'long' } } } };

    withIndex(callCluster as jest.Mock, { index: { status: 404 }, alias: { status: 404 } });

    await new IndexMigrator(testOpts).migrate();

    expect(
      callCluster.mock.calls
        .filter(([method]: [string]) => method === 'indices.create')
        .map(([_method, body]: [any, any]) => body)
    ).toEqual([
      {
        body: {
          mappings: {
            dynamic: 'strict',
            _meta: {
              migrationMappingPropertyHashes: {
                foo: 'c4d03d4291be731efbef6989d911b956',
                migrationVersion: '4a1746014a75ade3a714e1db5763276f',
                namespace: '2f4316de49999235636386fe51dc06c1',
                references: '7997cf5a56cc02bdc9c93361bde732b0',
                type: '2f4316de49999235636386fe51dc06c1',
                updated_at: '00da57df13e94e9d98437d13ace4bfe0',
              },
            },
            properties: {
              foo: { properties: { title: { type: 'long' } } },
              migrationVersion: { dynamic: 'true', type: 'object' },
              namespace: { type: 'keyword' },
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
      },
    ]);
  });

  test('returns stats about the migration', async () => {
    const { callCluster } = testOpts;

    withIndex(callCluster, { index: { status: 404 }, alias: { status: 404 } });

    const result = await new IndexMigrator(testOpts).migrate();

    expect(result).toMatchObject({
      alias: '.kibana',
      destIndex: '.kibana_1',
      sourceIndex: '.kibana',
      status: 'migrated',
    });
  });

  test('fails if there are multiple root doc types', async () => {
    const { callCluster } = testOpts;

    withIndex(callCluster, {
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
    const { callCluster } = testOpts;

    withIndex(callCluster, {
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

  test('retains mappings from the previous index', async () => {
    const { callCluster } = testOpts;

    testOpts.mappingProperties = { foo: { type: 'text' } };

    withIndex(callCluster, {
      index: {
        '.kibana_1': {
          aliases: {},
          mappings: {
            properties: {
              author: { type: 'text' },
            },
          },
        },
      },
    });

    await new IndexMigrator(testOpts).migrate();

    expect(callCluster).toHaveBeenCalledWith('indices.create', {
      body: {
        mappings: {
          dynamic: 'strict',
          _meta: {
            migrationMappingPropertyHashes: {
              foo: '625b32086eb1d1203564cf85062dd22e',
              migrationVersion: '4a1746014a75ade3a714e1db5763276f',
              namespace: '2f4316de49999235636386fe51dc06c1',
              references: '7997cf5a56cc02bdc9c93361bde732b0',
              type: '2f4316de49999235636386fe51dc06c1',
              updated_at: '00da57df13e94e9d98437d13ace4bfe0',
            },
          },
          properties: {
            author: { type: 'text' },
            foo: { type: 'text' },
            migrationVersion: { dynamic: 'true', type: 'object' },
            namespace: { type: 'keyword' },
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
    const { callCluster } = testOpts;

    withIndex(callCluster, { index: { status: 404 }, alias: { status: 404 } });

    await new IndexMigrator(testOpts).migrate();

    expect(callCluster).toHaveBeenCalledWith('indices.create', expect.any(Object));
    expect(callCluster).toHaveBeenCalledWith('indices.updateAliases', {
      body: { actions: [{ add: { alias: '.kibana', index: '.kibana_1' } }] },
    });
  });

  test('removes previous indices from the alias', async () => {
    const { callCluster } = testOpts;

    testOpts.documentMigrator.migrationVersion = {
      dashboard: '2.4.5',
    };

    withIndex(callCluster, { numOutOfDate: 1 });

    await new IndexMigrator(testOpts).migrate();

    expect(callCluster).toHaveBeenCalledWith('indices.create', expect.any(Object));
    expect(callCluster).toHaveBeenCalledWith('indices.updateAliases', {
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
    const { callCluster } = testOpts;
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

    withIndex(callCluster, {
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
    const bulkCalls = callCluster.mock.calls.filter(([action]: any) => action === 'bulk');
    expect(bulkCalls.length).toEqual(2);
    expect(bulkCalls[0]).toEqual([
      'bulk',
      {
        body: [
          { index: { _id: 'foo:1', _index: '.kibana_2' } },
          { foo: { name: 1 }, type: 'foo', migrationVersion: {}, references: [] },
        ],
      },
    ]);
    expect(bulkCalls[1]).toEqual([
      'bulk',
      {
        body: [
          { index: { _id: 'foo:2', _index: '.kibana_2' } },
          { foo: { name: 2 }, type: 'foo', migrationVersion: {}, references: [] },
        ],
      },
    ]);
  });

  describe('with dryRun=true', () => {
    beforeEach(() => {
      testOpts.dryRun = true;
    });

    test('skips dry run if an index does not exist', async () => {
      const { callCluster } = testOpts;

      withIndex(callCluster as jest.Mock, { index: { status: 404 }, alias: { status: 404 } });

      const result = await new IndexMigrator(testOpts).migrate();

      expect(result).toEqual({
        alias: '.kibana',
        reason: "nothing to migrate, index .kibana doesn't exist.",
        status: 'skipped',
      });

      expect(callCluster).toHaveBeenCalledTimes(1);
      expect(callCluster).toHaveBeenLastCalledWith('indices.get', {
        ignore: [404],
        index: '.kibana',
      });
    });
    test('skips dry run if an index, instead of an alias is found', async () => {
      const { callCluster } = testOpts;

      const index = {
        '.kibana': {
          aliases: {},
          mappings: {
            dynamic: 'strict',
            properties: {
              migrationVersion: { dynamic: 'true', type: 'object' },
            },
          },
        },
      };

      withIndex(callCluster as jest.Mock, { index, alias: { status: 404 } });
      (callCluster as jest.Mock).mockClear();
      const result = await new IndexMigrator(testOpts).migrate();

      expect(result).toEqual({
        alias: '.kibana',
        reason: 'expected an alias but found an index: .kibana.',
        status: 'skipped',
      });

      expect(callCluster).toHaveBeenCalledTimes(1);
      expect(callCluster).toHaveBeenLastCalledWith('indices.get', {
        ignore: [404],
        index: '.kibana',
      });
    });
  });
});

describe('migrateIndex with dryRun=true', () => {
  it('does not delete index templates ', async () => {
    const callCluster = jest.fn();
    withIndex(callCluster);
    await migrateIndex(
      {
        callCluster,
        alias: 'alias',
        source: {},
        dest: {},
        log: { info: jest.fn() },
        obsoleteIndexTemplatePattern: 'legacy index template',
      } as any,
      true
    );

    expect(
      callCluster.mock.calls.find(
        ([method]) => method === 'cat.templates' || method === 'indices.deleteTemplate'
      )
    ).not.toBeDefined();
  });

  it('does not convert an index to an alias', async () => {
    // As per the test 'skips dry run if an index, instead of an alias is
    // found' these conditions should never be possible, but since this is a
    // descructive action it's good to be doubly sure
    const callCluster = jest.fn();
    const index = {
      '.kibana': {
        aliases: {},
        mappings: {
          dynamic: 'strict',
          properties: {
            migrationVersion: { dynamic: 'true', type: 'object' },
          },
        },
      },
    };

    withIndex(callCluster, { index, alias: { status: 404 } });

    await migrateIndex(
      {
        callCluster,
        alias: 'alias',
        source: { exists: true, aliases: [], indexName: '.kibana' },
        dest: {},
        log: { info: jest.fn() },
      } as any,
      true
    );

    // When we encounter an index instead of an alias, we remove this index
    // using the indices.updateAliases API, so we need to assert that there
    // were no `indices.updateAliases` calls containing a `remove_index` action.
    expect(
      callCluster.mock.calls.find(
        ([method, { body }]) =>
          method === 'indices.updateAliases' &&
          !!body.actions.find((action: any) => action.remove_index != null)
      )
    ).not.toBeDefined();
  });
});

function withIndex(callCluster: jest.Mock, opts: any = {}) {
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
  const searchResult = (i: number) =>
    Promise.resolve({
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

  callCluster.mockImplementation(method => {
    if (method === 'indices.get') {
      return Promise.resolve(index);
    } else if (method === 'indices.getAlias') {
      return Promise.resolve(alias);
    } else if (method === 'reindex') {
      return Promise.resolve({ task: 'zeid', _shards: { successful: 1, total: 1 } });
    } else if (method === 'tasks.get') {
      return Promise.resolve({ completed: true });
    } else if (method === 'search') {
      return searchResult(0);
    } else if (method === 'bulk') {
      return Promise.resolve({ items: [] });
    } else if (method === 'count') {
      return Promise.resolve({ count: numOutOfDate, _shards: { successful: 1, total: 1 } });
    } else if (method === 'scroll' && scrollCallCounter <= docs.length) {
      const result = searchResult(scrollCallCounter);
      scrollCallCounter++;
      return result;
    } else if (method === 'cat.templates') {
      return Promise.resolve([{ name: 'legacy index template' }]);
    }
  });
}
