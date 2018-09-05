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
import * as Index from './elastic_index';

describe('ElasticIndex', () => {
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
        .returns(Promise.resolve({ _scroll_id: 'x', hits: { hits: _.cloneDeep(batch1) } }))
        .onCall(1)
        .returns(Promise.resolve({ _scroll_id: 'y', hits: { hits: _.cloneDeep(batch2) } }))
        .onCall(2)
        .returns(Promise.resolve({ _scroll_id: 'z', hits: { hits: [] } }))
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
        .returns(Promise.resolve({ _scroll_id: 'x', hits: { hits: _.cloneDeep(batch) } }))
        .onCall(1)
        .returns(Promise.resolve({ _scroll_id: 'z', hits: { hits: [] } }));

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
          return { count };
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
      expect(callCluster.args).toEqual([['indices.get', { ignore: [404], index: '.myalias' }]]);
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
          type: 'doc',
        },
      ]);
    });
  });
});
