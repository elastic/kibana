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
import sinon from 'sinon';
import { SavedObjectsSchema } from '../../schema';
import { ROOT_TYPE, SavedObjectDoc, SavedObjectsSerializer } from '../../serialization';
import { CallCluster } from './call_cluster';
import { IndexMigrator } from './index_migrator';

describe('IndexMigrator', () => {
  test('patches the index mappings if the index is already migrated', async () => {
    const opts = defaultOpts();
    const callCluster = clusterStub(opts);

    opts.mappingProperties = { foo: { type: 'text' } };

    withIndex(callCluster);

    const result = await new IndexMigrator(opts).migrate();

    expect(ranMigration(opts)).toBeFalsy();
    expect(result.status).toEqual('patched');
    sinon.assert.calledWith(callCluster, 'indices.putMapping', {
      body: {
        dynamic: 'strict',
        properties: {
          config: {
            dynamic: 'true',
            properties: { buildNum: { type: 'keyword' } },
          },
          foo: { type: 'text' },
          migrationVersion: { dynamic: 'true', type: 'object' },
          namespace: { type: 'keyword' },
          type: { type: 'keyword' },
          updated_at: { type: 'date' },
        },
      },
      index: '.kibana_1',
      include_type_name: true,
      type: ROOT_TYPE,
    });
  });

  test('creates the index if it does not exist', async () => {
    const opts = defaultOpts();
    const callCluster = clusterStub(opts);

    opts.mappingProperties = { foo: { type: 'long' } };

    withIndex(callCluster, { index: { status: 404 }, alias: { status: 404 } });

    await new IndexMigrator(opts).migrate();

    expect(ranMigration(opts)).toBeTruthy();
    sinon.assert.calledWith(callCluster, 'indices.create', {
      body: {
        mappings: {
          doc: {
            dynamic: 'strict',
            properties: {
              config: {
                dynamic: 'true',
                properties: { buildNum: { type: 'keyword' } },
              },
              foo: { type: 'long' },
              migrationVersion: { dynamic: 'true', type: 'object' },
              namespace: { type: 'keyword' },
              type: { type: 'keyword' },
              updated_at: { type: 'date' },
            },
          },
        },
        settings: { number_of_shards: 1, auto_expand_replicas: '0-1' },
      },
      index: '.kibana_1',
      include_type_name: true,
    });
  });

  test('returns stats about the migration', async () => {
    const opts = defaultOpts();
    const callCluster = clusterStub(opts);

    withIndex(callCluster, { index: { status: 404 }, alias: { status: 404 } });

    const result = await new IndexMigrator(opts).migrate();

    expect(result).toMatchObject({
      destIndex: '.kibana_1',
      sourceIndex: '.kibana',
      status: 'migrated',
    });
  });

  test('fails if there are multiple root doc types', async () => {
    const opts = defaultOpts();
    const callCluster = clusterStub(opts);

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

    await expect(new IndexMigrator(opts).migrate()).rejects.toThrow(
      /use the X-Pack upgrade assistant/
    );
  });

  test('fails if root doc type is not "doc"', async () => {
    const opts = defaultOpts();
    const callCluster = clusterStub(opts);

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

    await expect(new IndexMigrator(opts).migrate()).rejects.toThrow(
      /use the X-Pack upgrade assistant/
    );
  });

  test('retains mappings from the previous index', async () => {
    const opts = defaultOpts();
    const callCluster = clusterStub(opts);

    opts.mappingProperties = { foo: { type: 'text' } };

    withIndex(callCluster, {
      index: {
        '.kibana_1': {
          aliases: {},
          mappings: {
            doc: {
              properties: {
                author: { type: 'text' },
              },
            },
          },
        },
      },
      include_type_name: true,
    });

    await new IndexMigrator(opts).migrate();

    sinon.assert.calledWith(callCluster, 'indices.create', {
      body: {
        mappings: {
          doc: {
            dynamic: 'strict',
            properties: {
              author: { type: 'text' },
              config: {
                dynamic: 'true',
                properties: { buildNum: { type: 'keyword' } },
              },
              foo: { type: 'text' },
              migrationVersion: { dynamic: 'true', type: 'object' },
              namespace: { type: 'keyword' },
              type: { type: 'keyword' },
              updated_at: { type: 'date' },
            },
          },
        },
        settings: { number_of_shards: 1, auto_expand_replicas: '0-1' },
      },
      index: '.kibana_2',
      include_type_name: true,
    });
  });

  test('points the alias at the dest index', async () => {
    const opts = defaultOpts();
    const callCluster = clusterStub(opts);

    withIndex(callCluster, { index: { status: 404 }, alias: { status: 404 } });

    await new IndexMigrator(opts).migrate();

    expect(ranMigration(opts)).toBeTruthy();
    sinon.assert.calledWith(callCluster, 'indices.updateAliases', {
      body: { actions: [{ add: { alias: '.kibana', index: '.kibana_1' } }] },
    });
  });

  test('removes previous indices from the alias', async () => {
    const opts = defaultOpts();
    const callCluster = clusterStub(opts);

    opts.documentMigrator.migrationVersion = {
      dashboard: '2.4.5',
    };

    withIndex(callCluster, { numOutOfDate: 1 });

    await new IndexMigrator(opts).migrate();

    expect(ranMigration(opts)).toBeTruthy();
    sinon.assert.calledWith(callCluster, 'indices.updateAliases', {
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
    const opts = defaultOpts();
    const callCluster = clusterStub(opts);
    const migrateDoc = sinon.spy((doc: SavedObjectDoc) => ({
      ...doc,
      attributes: { name: ++count },
    }));

    opts.documentMigrator = {
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

    await new IndexMigrator(opts).migrate();

    expect(count).toEqual(2);
    sinon.assert.calledWith(migrateDoc, {
      id: '1',
      type: 'foo',
      attributes: { name: 'Bar' },
      migrationVersion: {},
    });
    sinon.assert.calledWith(migrateDoc, {
      id: '2',
      type: 'foo',
      attributes: { name: 'Baz' },
      migrationVersion: {},
    });
    expect(callCluster.args.filter(([action]) => action === 'bulk').length).toEqual(2);
    sinon.assert.calledWith(callCluster, 'bulk', {
      body: [
        { index: { _id: 'foo:1', _index: '.kibana_2', _type: ROOT_TYPE } },
        { foo: { name: 1 }, type: 'foo', migrationVersion: {} },
      ],
    });
    sinon.assert.calledWith(callCluster, 'bulk', {
      body: [
        { index: { _id: 'foo:2', _index: '.kibana_2', _type: ROOT_TYPE } },
        { foo: { name: 2 }, type: 'foo', migrationVersion: {} },
      ],
    });
  });
});

function defaultOpts() {
  return {
    batchSize: 10,
    callCluster: sinon.stub(),
    index: '.kibana',
    log: sinon.stub(),
    mappingProperties: {},
    pollInterval: 1,
    scrollDuration: '1m',
    documentMigrator: {
      migrationVersion: {},
      migrate: _.identity,
    },
    serializer: new SavedObjectsSerializer(new SavedObjectsSchema()),
  };
}

function withIndex(callCluster: sinon.SinonStub, opts: any = {}) {
  const defaultIndex = {
    '.kibana_1': {
      aliases: { '.kibana': {} },
      mappings: {
        doc: {
          dynamic: 'strict',
          properties: {
            migrationVersion: { dynamic: 'true', type: 'object' },
          },
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
  callCluster.withArgs('indices.get').returns(Promise.resolve(index));
  callCluster.withArgs('indices.getAlias').returns(Promise.resolve(alias));
  callCluster
    .withArgs('reindex')
    .returns(Promise.resolve({ task: 'zeid', _shards: { successful: 1, total: 1 } }));
  callCluster.withArgs('tasks.get').returns(Promise.resolve({ completed: true }));
  callCluster.withArgs('search').returns(searchResult(0));

  _.range(1, docs.length).forEach(i => {
    callCluster
      .withArgs('scroll')
      .onCall(i - 1)
      .returns(searchResult(i));
  });

  callCluster
    .withArgs('scroll')
    .onCall(docs.length - 1)
    .returns(searchResult(docs.length));

  callCluster.withArgs('bulk').returns(Promise.resolve({ items: [] }));
  callCluster
    .withArgs('count')
    .returns(Promise.resolve({ count: numOutOfDate, _shards: { successful: 1, total: 1 } }));
}

function clusterStub(opts: { callCluster: CallCluster }) {
  return opts.callCluster as sinon.SinonStub;
}

function ranMigration(opts: { callCluster: CallCluster }) {
  return clusterStub(opts).calledWith('indices.create', sinon.match.any);
}
