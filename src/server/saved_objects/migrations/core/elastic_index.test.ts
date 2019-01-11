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
import { ROOT_TYPE } from '../../serialization';
import * as Index from './elastic_index';

describe('ElasticIndex', () => {
  describe('fetchInfo', () => {
    test('it handles 404', async () => {
      const callCluster = sinon.spy(async (path: string, { ignore, index }: any) => {
        expect(path).toEqual('indices.get');
        expect(ignore).toEqual([404]);
        expect(index).toEqual('.kibana-test');
        return { status: 404 };
      });

      const info = await Index.fetchInfo(callCluster, '.kibana-test');
      expect(info).toEqual({
        aliases: {},
        exists: false,
        indexName: '.kibana-test',
        mappings: { doc: { dynamic: 'strict', properties: {} } },
      });
    });

    test('fails if the index doc type is unsupported', async () => {
      const callCluster = sinon.spy(async (path: string, { index }: any) => {
        return {
          [index]: {
            aliases: { foo: index },
            mappings: { spock: { dynamic: 'strict', properties: { a: 'b' } } },
          },
        };
      });

      await expect(Index.fetchInfo(callCluster, '.baz')).rejects.toThrow(
        /cannot be automatically migrated/
      );
    });

    test('fails if there are multiple root types', async () => {
      const callCluster = sinon.spy(async (path: string, { index }: any) => {
        return {
          [index]: {
            aliases: { foo: index },
            mappings: {
              doc: { dynamic: 'strict', properties: { a: 'b' } },
              doctor: { dynamic: 'strict', properties: { a: 'b' } },
            },
          },
        };
      });

      await expect(Index.fetchInfo(callCluster, '.baz')).rejects.toThrow(
        /cannot be automatically migrated/
      );
    });

    test('decorates index info with exists and indexName', async () => {
      const callCluster = sinon.spy(async (path: string, { index }: any) => {
        return {
          [index]: {
            aliases: { foo: index },
            mappings: { doc: { dynamic: 'strict', properties: { a: 'b' } } },
          },
        };
      });

      const info = await Index.fetchInfo(callCluster, '.baz');
      expect(info).toEqual({
        aliases: { foo: '.baz' },
        mappings: { doc: { dynamic: 'strict', properties: { a: 'b' } } },
        exists: true,
        indexName: '.baz',
      });
    });
  });

  describe('createIndex', () => {
    test('calls indices.create', async () => {
      const callCluster = sinon.spy(async (path: string, { body, index }: any) => {
        expect(path).toEqual('indices.create');
        expect(body).toEqual({
          mappings: { foo: 'bar' },
          settings: { auto_expand_replicas: '0-1', number_of_shards: 1 },
        });
        expect(index).toEqual('.abcd');
      });

      await Index.createIndex(callCluster, '.abcd', { foo: 'bar' } as any);
      sinon.assert.called(callCluster);
    });
  });

  describe('deleteIndex', () => {
    test('calls indices.delete', async () => {
      const callCluster = sinon.spy(async (path: string, { index }: any) => {
        expect(path).toEqual('indices.delete');
        expect(index).toEqual('.lotr');
      });

      await Index.deleteIndex(callCluster, '.lotr');
      sinon.assert.called(callCluster);
    });
  });

  describe('putMappings', () => {
    test('it calls indices.putMapping', async () => {
      const callCluster = sinon.spy(async (path: string, { body, type, index }: any) => {
        expect(path).toEqual('indices.putMapping');
        expect(index).toEqual('.shazm');
        expect(type).toEqual(ROOT_TYPE);
        expect(body).toEqual({
          dynamic: 'strict',
          properties: {
            foo: 'bar',
          },
        });
      });

      await Index.putMappings(callCluster, '.shazm', {
        doc: {
          dynamic: 'strict',
          properties: {
            foo: 'bar',
          },
        },
      });

      sinon.assert.called(callCluster);
    });
  });

  describe('claimAlias', () => {
    function assertCalled(callCluster: sinon.SinonSpy) {
      expect(callCluster.args.map(([path]) => path)).toEqual([
        'indices.getAlias',
        'indices.updateAliases',
        'indices.refresh',
      ]);
    }

    test('handles unaliased indices', async () => {
      const callCluster = sinon.spy(async (path: string, arg: any) => {
        switch (path) {
          case 'indices.getAlias':
            expect(arg.ignore).toEqual([404]);
            expect(arg.name).toEqual('.hola');
            return { status: 404 };
          case 'indices.updateAliases':
            expect(arg.body).toEqual({
              actions: [{ add: { index: '.hola-42', alias: '.hola' } }],
            });
            return true;
          case 'indices.refresh':
            expect(arg.index).toEqual('.hola-42');
            return true;
          default:
            throw new Error(`Dunnoes what ${path} means.`);
        }
      });

      await Index.claimAlias(callCluster, '.hola-42', '.hola');

      assertCalled(callCluster);
    });

    test('removes existing alias', async () => {
      const callCluster = sinon.spy(async (path: string, arg: any) => {
        switch (path) {
          case 'indices.getAlias':
            return { '.my-fanci-index': '.muchacha' };
          case 'indices.updateAliases':
            expect(arg.body).toEqual({
              actions: [
                { remove: { index: '.my-fanci-index', alias: '.muchacha' } },
                { add: { index: '.ze-index', alias: '.muchacha' } },
              ],
            });
            return true;
          case 'indices.refresh':
            expect(arg.index).toEqual('.ze-index');
            return true;
          default:
            throw new Error(`Dunnoes what ${path} means.`);
        }
      });

      await Index.claimAlias(callCluster, '.ze-index', '.muchacha');

      assertCalled(callCluster);
    });

    test('allows custom alias actions', async () => {
      const callCluster = sinon.spy(async (path: string, arg: any) => {
        switch (path) {
          case 'indices.getAlias':
            return { '.my-fanci-index': '.muchacha' };
          case 'indices.updateAliases':
            expect(arg.body).toEqual({
              actions: [
                { remove_index: { index: 'awww-snap!' } },
                { remove: { index: '.my-fanci-index', alias: '.muchacha' } },
                { add: { index: '.ze-index', alias: '.muchacha' } },
              ],
            });
            return true;
          case 'indices.refresh':
            expect(arg.index).toEqual('.ze-index');
            return true;
          default:
            throw new Error(`Dunnoes what ${path} means.`);
        }
      });

      await Index.claimAlias(callCluster, '.ze-index', '.muchacha', [
        { remove_index: { index: 'awww-snap!' } },
      ]);

      assertCalled(callCluster);
    });
  });

  describe('convertToAlias', () => {
    test('it creates the destination index, then reindexes to it', async () => {
      const callCluster = sinon.spy(async (path: string, arg: any) => {
        switch (path) {
          case 'indices.create':
            expect(arg.body).toEqual({
              mappings: {
                doc: {
                  dynamic: 'strict',
                  properties: { foo: 'bar' },
                },
              },
              settings: { auto_expand_replicas: '0-1', number_of_shards: 1 },
            });
            expect(arg.index).toEqual('.ze-index');
            return true;
          case 'reindex':
            expect(arg).toMatchObject({
              body: {
                dest: { index: '.ze-index' },
                source: { index: '.muchacha' },
              },
              refresh: true,
              waitForCompletion: false,
            });
            return { task: 'abc' };
          case 'tasks.get':
            expect(arg.taskId).toEqual('abc');
            return { completed: true };
          case 'indices.getAlias':
            return { '.my-fanci-index': '.muchacha' };
          case 'indices.updateAliases':
            expect(arg.body).toEqual({
              actions: [
                { remove_index: { index: '.muchacha' } },
                { remove: { alias: '.muchacha', index: '.my-fanci-index' } },
                { add: { index: '.ze-index', alias: '.muchacha' } },
              ],
            });
            return true;
          case 'indices.refresh':
            expect(arg.index).toEqual('.ze-index');
            return true;
          default:
            throw new Error(`Dunnoes what ${path} means.`);
        }
      });

      const info = {
        aliases: {},
        exists: true,
        indexName: '.ze-index',
        mappings: {
          doc: {
            dynamic: 'strict',
            properties: { foo: 'bar' },
          },
        },
      };
      await Index.convertToAlias(callCluster, info, '.muchacha', 10);

      expect(callCluster.args.map(([path]) => path)).toEqual([
        'indices.create',
        'reindex',
        'tasks.get',
        'indices.getAlias',
        'indices.updateAliases',
        'indices.refresh',
      ]);
    });

    test('throws error if re-index task fails', async () => {
      const callCluster = sinon.spy(async (path: string, arg: any) => {
        switch (path) {
          case 'indices.create':
            expect(arg.body).toEqual({
              mappings: {
                doc: {
                  dynamic: 'strict',
                  properties: { foo: 'bar' },
                },
              },
              settings: { auto_expand_replicas: '0-1', number_of_shards: 1 },
            });
            expect(arg.index).toEqual('.ze-index');
            return true;
          case 'reindex':
            expect(arg).toMatchObject({
              body: {
                dest: { index: '.ze-index' },
                source: { index: '.muchacha' },
              },
              refresh: true,
              waitForCompletion: false,
            });
            return { task: 'abc' };
          case 'tasks.get':
            expect(arg.taskId).toEqual('abc');
            return {
              completed: true,
              error: {
                type: 'search_phase_execution_exception',
                reason: 'all shards failed',
                failed_shards: [],
              },
            };
          default:
            throw new Error(`Dunnoes what ${path} means.`);
        }
      });

      const info = {
        aliases: {},
        exists: true,
        indexName: '.ze-index',
        mappings: {
          doc: {
            dynamic: 'strict',
            properties: { foo: 'bar' },
          },
        },
      };
      await expect(Index.convertToAlias(callCluster, info, '.muchacha', 10)).rejects.toThrow(
        /Re-index failed \[search_phase_execution_exception\] all shards failed/
      );

      expect(callCluster.args.map(([path]) => path)).toEqual([
        'indices.create',
        'reindex',
        'tasks.get',
      ]);
    });
  });

  describe('write', () => {
    test('writes documents in bulk to the index', async () => {
      const index = '.myalias';
      const callCluster = sinon.stub();
      const docs = [
        {
          _id: 'niceguy:fredrogers',
          _source: {
            type: 'niceguy',
            niceguy: {
              aka: 'Mr Rogers',
            },
            quotes: ['The greatest gift you ever give is your honest self.'],
          },
        },
        {
          _id: 'badguy:rickygervais',
          _source: {
            type: 'badguy',
            badguy: {
              aka: 'Dominic Badguy',
            },
            migrationVersion: { badguy: '2.3.4' },
          },
        },
      ];

      callCluster.returns(
        Promise.resolve({
          items: [],
        })
      );

      await Index.write(callCluster, index, docs);

      sinon.assert.calledOnce(callCluster);
      expect(callCluster.args[0]).toMatchSnapshot();
    });

    test('fails if any document fails', async () => {
      const index = '.myalias';
      const callCluster = sinon.stub();
      const docs = [
        {
          _id: 'niceguy:fredrogers',
          _source: {
            type: 'niceguy',
            niceguy: {
              aka: 'Mr Rogers',
            },
          },
        },
      ];

      callCluster.returns(
        Promise.resolve({
          items: [{ index: { error: { type: 'shazm', reason: 'dern' } } }],
        })
      );

      await expect(Index.write(callCluster, index, docs)).rejects.toThrow(/dern/);
      sinon.assert.calledOnce(callCluster);
    });
  });

  describe('reader', () => {
    test('returns docs in batches', async () => {
      const index = '.myalias';
      const callCluster = sinon.stub();

      const batch1 = [
        {
          _id: 'such:1',
          _source: { type: 'such', such: { num: 1 } },
        },
      ];

      const batch2 = [
        {
          _id: 'aaa:2',
          _source: { type: 'aaa', aaa: { num: 2 } },
        },
        {
          _id: 'bbb:3',
          _source: {
            bbb: { num: 3 },
            migrationVersion: { bbb: '3.2.5' },
            type: 'bbb',
          },
        },
      ];

      callCluster
        .onCall(0)
        .returns(
          Promise.resolve({
            _scroll_id: 'x',
            _shards: { success: 1, total: 1 },
            hits: { hits: _.cloneDeep(batch1) },
          })
        )
        .onCall(1)
        .returns(
          Promise.resolve({
            _scroll_id: 'y',
            _shards: { success: 1, total: 1 },
            hits: { hits: _.cloneDeep(batch2) },
          })
        )
        .onCall(2)
        .returns(
          Promise.resolve({
            _scroll_id: 'z',
            _shards: { success: 1, total: 1 },
            hits: { hits: [] },
          })
        )
        .onCall(3)
        .returns(Promise.resolve());

      const read = Index.reader(callCluster, index, { batchSize: 100, scrollDuration: '5m' });

      expect(await read()).toEqual(batch1);
      expect(await read()).toEqual(batch2);
      expect(await read()).toEqual([]);

      // Check order of calls, as well as args
      expect(callCluster.args).toEqual([
        ['search', { body: { size: 100 }, index, scroll: '5m' }],
        ['scroll', { scroll: '5m', scrollId: 'x' }],
        ['scroll', { scroll: '5m', scrollId: 'y' }],
        ['clearScroll', { scrollId: 'z' }],
      ]);
    });

    test('returns all root-level properties', async () => {
      const index = '.myalias';
      const callCluster = sinon.stub();
      const batch = [
        {
          _id: 'such:1',
          _source: {
            acls: '3230a',
            foos: { is: 'fun' },
            such: { num: 1 },
            type: 'such',
          },
        },
      ];

      callCluster
        .onCall(0)
        .returns(
          Promise.resolve({
            _scroll_id: 'x',
            _shards: { success: 1, total: 1 },
            hits: { hits: _.cloneDeep(batch) },
          })
        )
        .onCall(1)
        .returns(
          Promise.resolve({
            _scroll_id: 'z',
            _shards: { success: 1, total: 1 },
            hits: { hits: [] },
          })
        );

      const read = Index.reader(callCluster, index, {
        batchSize: 100,
        scrollDuration: '5m',
      });

      expect(await read()).toEqual(batch);
    });

    test('fails if not all shards were successful', async () => {
      const index = '.myalias';
      const callCluster = sinon.stub();

      callCluster.returns(Promise.resolve({ _shards: { successful: 1, total: 2 } }));

      const read = Index.reader(callCluster, index, {
        batchSize: 100,
        scrollDuration: '5m',
      });

      await expect(read()).rejects.toThrow(/shards failed/);
    });

    test('handles shards not being returned', async () => {
      const index = '.myalias';
      const callCluster = sinon.stub();
      const batch = [
        {
          _id: 'such:1',
          _source: {
            acls: '3230a',
            foos: { is: 'fun' },
            such: { num: 1 },
            type: 'such',
          },
        },
      ];

      callCluster
        .onCall(0)
        .returns(
          Promise.resolve({
            _scroll_id: 'x',
            hits: { hits: _.cloneDeep(batch) },
          })
        )
        .onCall(1)
        .returns(
          Promise.resolve({
            _scroll_id: 'z',
            hits: { hits: [] },
          })
        );

      const read = Index.reader(callCluster, index, {
        batchSize: 100,
        scrollDuration: '5m',
      });

      expect(await read()).toEqual(batch);
    });
  });

  describe('migrationsUpToDate', () => {
    // A helper to reduce boilerplate in the hasMigration tests that follow.
    async function testMigrationsUpToDate({
      index = '.myindex',
      mappings,
      count,
      migrations,
    }: any) {
      const callCluster = sinon.spy(async (path: string) => {
        if (path === 'indices.get') {
          return {
            [index]: { mappings },
          };
        }
        if (path === 'count') {
          return { count, _shards: { success: 1, total: 1 } };
        }
        throw new Error(`Unknown command ${path}.`);
      });
      const hasMigrations = await Index.migrationsUpToDate(callCluster, index, migrations);
      return { hasMigrations, callCluster };
    }

    test('is false if the index mappings do not contain migrationVersion', async () => {
      const { hasMigrations, callCluster } = await testMigrationsUpToDate({
        index: '.myalias',
        mappings: {
          doc: {
            properties: {
              dashboard: { type: 'text' },
            },
          },
        },
        count: 0,
        migrations: { dashy: '2.3.4' },
      });

      expect(hasMigrations).toBeFalsy();
      expect(callCluster.args).toEqual([
        [
          'indices.get',
          {
            ignore: [404],
            index: '.myalias',
            include_type_name: true,
          },
        ],
      ]);
    });

    test('is true if there are no migrations defined', async () => {
      const { hasMigrations, callCluster } = await testMigrationsUpToDate({
        index: '.myalias',
        mappings: {
          doc: {
            properties: {
              migrationVersion: {
                dynamic: 'true',
                type: 'object',
              },
              dashboard: { type: 'text' },
            },
          },
        },
        count: 2,
        migrations: {},
      });

      expect(hasMigrations).toBeTruthy();
      sinon.assert.calledOnce(callCluster);
      expect(callCluster.args[0][0]).toEqual('indices.get');
    });

    test('is true if there are no documents out of date', async () => {
      const { hasMigrations, callCluster } = await testMigrationsUpToDate({
        index: '.myalias',
        mappings: {
          doc: {
            properties: {
              migrationVersion: {
                dynamic: 'true',
                type: 'object',
              },
              dashboard: { type: 'text' },
            },
          },
        },
        count: 0,
        migrations: { dashy: '23.2.5' },
      });

      expect(hasMigrations).toBeTruthy();
      sinon.assert.calledTwice(callCluster);
      expect(callCluster.args[0][0]).toEqual('indices.get');
      expect(callCluster.args[1][0]).toEqual('count');
    });

    test('is false if there are documents out of date', async () => {
      const { hasMigrations, callCluster } = await testMigrationsUpToDate({
        index: '.myalias',
        mappings: {
          doc: {
            properties: {
              migrationVersion: {
                dynamic: 'true',
                type: 'object',
              },
              dashboard: { type: 'text' },
            },
          },
        },
        count: 3,
        migrations: { dashy: '23.2.5' },
      });

      expect(hasMigrations).toBeFalsy();
      sinon.assert.calledTwice(callCluster);
      expect(callCluster.args[0][0]).toEqual('indices.get');
      expect(callCluster.args[1][0]).toEqual('count');
    });

    test('counts docs that are out of date', async () => {
      const { callCluster } = await testMigrationsUpToDate({
        index: '.myalias',
        mappings: {
          doc: {
            properties: {
              migrationVersion: {
                dynamic: 'true',
                type: 'object',
              },
              dashboard: { type: 'text' },
            },
          },
        },
        count: 0,
        migrations: {
          dashy: '23.2.5',
          bashy: '99.9.3',
          flashy: '3.4.5',
        },
      });

      function shouldClause(type: string, version: string) {
        return {
          bool: {
            must: [
              { exists: { field: type } },
              {
                bool: {
                  must_not: { term: { [`migrationVersion.${type}`]: version } },
                },
              },
            ],
          },
        };
      }

      expect(callCluster.args[1]).toEqual([
        'count',
        {
          body: {
            query: {
              bool: {
                should: [
                  shouldClause('dashy', '23.2.5'),
                  shouldClause('bashy', '99.9.3'),
                  shouldClause('flashy', '3.4.5'),
                ],
              },
            },
          },
          index: '.myalias',
          type: ROOT_TYPE,
        },
      ]);
    });
  });
});
