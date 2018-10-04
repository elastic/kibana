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
import { ROOT_TYPE, SavedObjectsSerializer } from '../../serialization';
import { createIndexMigrator } from './index_migrator';

describe('index_migrator', () => {
  describe('migrate', () => {
    const defaultMappings = {
      config: {
        dynamic: 'true',
        properties: { buildNum: { type: 'keyword' } },
      },
      foo: { type: 'long' },
      migrationVersion: { dynamic: 'true', type: 'object' },
      namespace: { type: 'keyword' },
      type: { type: 'keyword' },
      updated_at: { type: 'date' },
    };

    test('patches the index mappings if the index is already migrated', async () => {
      const { callCluster, migrator } = await createTestMigrator({
        mappingProperties: { foo: { type: 'text' } },
      });

      const result = await migrator.migrate();
      expect(ranMigration({ callCluster })).toBeFalsy();
      expect(result.status).toEqual('patched');
      sinon.assert.calledWith(callCluster, 'indices.putMapping', {
        body: {
          dynamic: 'strict',
          properties: {
            ...defaultMappings,
            foo: { type: 'text' },
          },
        },
        index: '.kibana_1',
        type: ROOT_TYPE,
      });
    });

    test('creates the index if it does not exist', async () => {
      const { callCluster, migrator } = await createTestMigrator({
        index: { status: 404 },
        mappingProperties: { foo: { type: 'long' } },
      });

      await migrator.migrate();

      expect(ranMigration({ callCluster })).toBeTruthy();
      sinon.assert.calledWith(callCluster, 'indices.create', {
        body: {
          mappings: {
            doc: {
              dynamic: 'strict',
              properties: {
                ...defaultMappings,
                foo: { type: 'long' },
              },
            },
          },
        },
        index: '.kibana_1',
      });
    });

    test('returns stats about the migration', async () => {
      const { migrator } = await createTestMigrator({
        index: { status: 404 },
        mappingProperties: { foo: { type: 'long' } },
      });

      const result = await migrator.migrate();

      expect(result).toMatchObject({
        destIndex: '.kibana_1',
        sourceIndex: '.kibana',
        status: 'migrated',
      });
    });

    test('fails if there are multiple root doc types', async () => {
      const migrate = async () => {
        const { migrator } = await createTestMigrator({
          index: {
            '.kibana_1': {
              aliases: {},
              mappings: {
                foo: { properties: {} },
                doc: { properties: {} },
              },
            },
          },
        });

        await migrator.migrate();
      };

      await expect(migrate()).rejects.toThrow(/use the X-Pack upgrade assistant/);
    });

    test('fails if root doc type is not "doc"', async () => {
      const migrate = async () => {
        const { migrator } = await createTestMigrator({
          index: {
            '.kibana_1': {
              aliases: {},
              mappings: {
                soc: { properties: {} },
              },
            },
          },
        });

        await migrator.migrate();
      };

      await expect(migrate()).rejects.toThrow(/use the X-Pack upgrade assistant/);
    });

    test('retains mappings from the previous index', async () => {
      const { callCluster, migrator } = await createTestMigrator({
        mappingProperties: { foo: { type: 'text' } },
        index: {
          '.kibana_1': {
            aliases: {},
            mappings: {
              doc: { properties: { author: { type: 'text' } } },
            },
          },
        },
      });

      await migrator.migrate();

      sinon.assert.calledWith(callCluster, 'indices.create', {
        body: {
          mappings: {
            doc: {
              dynamic: 'strict',
              properties: {
                ...defaultMappings,
                author: { type: 'text' },
                foo: { type: 'text' },
              },
            },
          },
        },
        index: '.kibana_2',
      });
    });

    test('points the alias at the dest index', async () => {
      const { callCluster, migrator } = await createTestMigrator({
        mappingProperties: { foo: { type: 'text' } },
        index: { status: 404 },
      });

      await migrator.migrate();

      expect(ranMigration({ callCluster })).toBeTruthy();
      sinon.assert.calledWith(callCluster, 'indices.updateAliases', {
        body: { actions: [{ add: { alias: '.kibana', index: '.kibana_1' } }] },
      });
    });

    test('removes previous indices from the alias', async () => {
      const { callCluster, migrator } = await createTestMigrator({
        migrationVersion: { dashboard: '2.4.5' },
        numOutOfDate: 1,
      });

      await migrator.migrate();

      expect(ranMigration({ callCluster })).toBeTruthy();
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
      const migrate = sinon.spy((doc: any) => ({
        ...doc,
        attributes: { name: doc.attributes.name + '!!!' },
      }));
      const { callCluster, migrator } = await createTestMigrator({
        migrate,
        migrationVersion: { foo: '1.2.3' },
        search: [
          [{ _id: 'foo:1', _source: { type: 'foo', foo: { name: 'Bar' } } }],
          [{ _id: 'foo:2', _source: { type: 'foo', foo: { name: 'Baz' } } }],
        ],
      });

      await migrator.migrate();

      sinon.assert.calledTwice(migrate);

      sinon.assert.calledWith(migrate, {
        id: '1',
        type: 'foo',
        attributes: { name: 'Bar' },
        migrationVersion: {},
      });

      sinon.assert.calledWith(migrate, {
        id: '2',
        type: 'foo',
        attributes: { name: 'Baz' },
        migrationVersion: {},
      });

      expect(callCluster.args.filter(([action]) => action === 'bulk').length).toEqual(2);

      sinon.assert.calledWith(callCluster, 'bulk', {
        body: [
          { index: { _id: 'foo:1', _index: '.kibana_2', _type: ROOT_TYPE } },
          { foo: { name: 'Bar!!!' }, type: 'foo', migrationVersion: {} },
        ],
      });

      sinon.assert.calledWith(callCluster, 'bulk', {
        body: [
          { index: { _id: 'foo:2', _index: '.kibana_2', _type: ROOT_TYPE } },
          { foo: { name: 'Baz!!!' }, type: 'foo', migrationVersion: {} },
        ],
      });
    });
  });

  describe('fetchProgress', () => {
    test('progress is not 100% until migration finishes', async () => {
      const { migrator } = await createTestMigrator({
        numOutOfDate: 9,
        migrationVersion: { dash: '1.2.3' },
        count: {
          '.kibana': 9,
          '.kibana_1': 9,
          '.kibana_2': 9,
        },
      });
      expect(await migrator.fetchProgress()).toBeGreaterThan(0.8);
      expect(await migrator.fetchProgress()).toBeLessThan(1);
      await migrator.migrate();
      expect(await migrator.fetchProgress()).toEqual(1);
    });

    test('progress handles 404 and 503 errors', async () => {
      const { callCluster, migrator } = await createTestMigrator({
        numOutOfDate: 9,
        migrationVersion: { dash: '1.2.3' },
        count: {},
      });

      expect(await migrator.fetchProgress()).toEqual(0);
      const [, args] = _.last(callCluster.args.filter(([path]) => path === 'count'));
      expect(args.ignore).toEqual([404, 503]);
    });

    test('progress is based on how many docs have been moved', async () => {
      const { migrator } = await createTestMigrator({
        numOutOfDate: 9,
        migrationVersion: { dash: '1.2.3' },
        count: {
          '.kibana': 20,
          '.kibana_2': 8,
        },
      });
      expect(await migrator.fetchProgress()).toEqual(0.4);
      await migrator.migrate();
      expect(await migrator.fetchProgress()).toEqual(1);
    });

    test('progress takes reindexing into account', async () => {
      const { migrator } = await createTestMigrator({
        numOutOfDate: 9,
        migrationVersion: { dash: '1.2.3' },
        index: {
          '.kibana': {
            aliases: {},
            mappings: { doc: { dynamic: 'strict', properties: {} } },
          },
        },
        count: {
          '.kibana': 20,
          '.kibana_2': 4,
          '.kibana_1': 3,
        },
      });

      expect(await migrator.fetchProgress()).toEqual(0.175);
      await migrator.migrate();
      expect(await migrator.fetchProgress()).toEqual(1);
    });
  });
});

function ranMigration({ callCluster }: { callCluster: sinon.SinonSpy }) {
  return callCluster.args.filter(([path]) => path === 'indices.create').length > 0;
}

async function createTestMigrator(testOpts: any = {}) {
  let searchCount = 0;
  const index = testOpts.index || {
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

  const callCluster = sinon.spy(async (path: string, args: any) => {
    switch (path) {
      case 'count':
        if (args.body) {
          return { count: testOpts.numOutOfDate };
        }
        return { count: _.get(testOpts, ['count', args.index], undefined) };
      case 'indices.get':
        return index;
      case 'indices.getAlias':
        return Object.keys(index)
          .filter((k: string) => _.get(index, [k, 'aliases', args.name]))
          .reduce((acc: any, k: string) => ({ ...acc, [k]: {} }), {});
      case 'search':
        const hits = _.get(testOpts, ['search', searchCount], []);
        ++searchCount;
        return { hits: { hits } };
      case 'bulk':
        return { items: [] };
      case 'reindex':
        return { task: 23 };
      case 'tasks.get':
        return { completed: true };
    }
  });

  const opts = {
    batchSize: 10,
    callCluster,
    index: '.kibana',
    log: sinon.stub(),
    mappingProperties: testOpts.mappingProperties || {},
    pollInterval: 1,
    scrollDuration: '1m',
    serializer: new SavedObjectsSerializer(new SavedObjectsSchema()),
    documentMigrator: {
      migrationVersion: testOpts.migrationVersion || {},
      migrate: testOpts.migrate || _.identity,
    },
  };

  return {
    callCluster,
    migrator: await createIndexMigrator(opts),
  };
}
