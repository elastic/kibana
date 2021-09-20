/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { estypes } from '@elastic/elasticsearch';
import _ from 'lodash';
import { elasticsearchClientMock } from '../../../elasticsearch/client/mocks';
import * as Index from './elastic_index';

describe('ElasticIndex', () => {
  let client: ReturnType<typeof elasticsearchClientMock.createElasticsearchClient>;

  beforeEach(() => {
    client = elasticsearchClientMock.createElasticsearchClient();
  });
  describe('fetchInfo', () => {
    test('it handles 404', async () => {
      client.indices.get.mockResolvedValue(
        elasticsearchClientMock.createSuccessTransportRequestPromise({}, { statusCode: 404 })
      );

      const info = await Index.fetchInfo(client, '.kibana-test');
      expect(info).toEqual({
        aliases: {},
        exists: false,
        indexName: '.kibana-test',
        mappings: { dynamic: 'strict', properties: {} },
      });

      expect(client.indices.get).toHaveBeenCalledWith({ index: '.kibana-test' }, { ignore: [404] });
    });

    test('decorates index info with exists and indexName', async () => {
      client.indices.get.mockImplementation((params) => {
        const index = params!.index as string;
        return elasticsearchClientMock.createSuccessTransportRequestPromise({
          [index]: {
            aliases: { foo: index },
            mappings: { dynamic: 'strict', properties: { a: 'b' } as any },
            settings: {},
          },
        } as estypes.IndicesGetResponse);
      });

      const info = await Index.fetchInfo(client, '.baz');
      expect(info).toEqual({
        aliases: { foo: '.baz' },
        mappings: { dynamic: 'strict', properties: { a: 'b' } },
        exists: true,
        indexName: '.baz',
        settings: {},
      });
    });
  });

  describe('createIndex', () => {
    test('calls indices.create', async () => {
      await Index.createIndex(client, '.abcd', { foo: 'bar' } as any);

      expect(client.indices.create).toHaveBeenCalledTimes(1);
      expect(client.indices.create).toHaveBeenCalledWith({
        body: {
          mappings: { foo: 'bar' },
          settings: {
            auto_expand_replicas: '0-1',
            number_of_shards: 1,
          },
        },
        index: '.abcd',
      });
    });
  });

  describe('claimAlias', () => {
    test('handles unaliased indices', async () => {
      client.indices.getAlias.mockResolvedValue(
        elasticsearchClientMock.createSuccessTransportRequestPromise({}, { statusCode: 404 })
      );

      await Index.claimAlias(client, '.hola-42', '.hola');

      expect(client.indices.getAlias).toHaveBeenCalledWith(
        {
          name: '.hola',
        },
        { ignore: [404] }
      );
      expect(client.indices.updateAliases).toHaveBeenCalledWith({
        body: {
          actions: [{ add: { index: '.hola-42', alias: '.hola' } }],
        },
      });
      expect(client.indices.refresh).toHaveBeenCalledWith({
        index: '.hola-42',
      });
    });

    test('removes existing alias', async () => {
      client.indices.getAlias.mockResolvedValue(
        elasticsearchClientMock.createSuccessTransportRequestPromise({
          '.my-fanci-index': { aliases: { '.muchacha': {} } },
        })
      );

      await Index.claimAlias(client, '.ze-index', '.muchacha');

      expect(client.indices.getAlias).toHaveBeenCalledTimes(1);
      expect(client.indices.updateAliases).toHaveBeenCalledWith({
        body: {
          actions: [
            { remove: { index: '.my-fanci-index', alias: '.muchacha' } },
            { add: { index: '.ze-index', alias: '.muchacha' } },
          ],
        },
      });
      expect(client.indices.refresh).toHaveBeenCalledWith({
        index: '.ze-index',
      });
    });

    test('allows custom alias actions', async () => {
      client.indices.getAlias.mockResolvedValue(
        elasticsearchClientMock.createSuccessTransportRequestPromise({
          '.my-fanci-index': { aliases: { '.muchacha': {} } },
        })
      );

      await Index.claimAlias(client, '.ze-index', '.muchacha', [
        { remove_index: { index: 'awww-snap!' } },
      ]);

      expect(client.indices.getAlias).toHaveBeenCalledTimes(1);
      expect(client.indices.updateAliases).toHaveBeenCalledWith({
        body: {
          actions: [
            { remove_index: { index: 'awww-snap!' } },
            { remove: { index: '.my-fanci-index', alias: '.muchacha' } },
            { add: { index: '.ze-index', alias: '.muchacha' } },
          ],
        },
      });
      expect(client.indices.refresh).toHaveBeenCalledWith({
        index: '.ze-index',
      });
    });
  });

  describe('convertToAlias', () => {
    test('it creates the destination index, then reindexes to it', async () => {
      client.indices.getAlias.mockResolvedValue(
        elasticsearchClientMock.createSuccessTransportRequestPromise({
          '.my-fanci-index': { aliases: { '.muchacha': {} } },
        })
      );
      client.reindex.mockResolvedValue(
        elasticsearchClientMock.createSuccessTransportRequestPromise({
          task: 'abc',
        } as estypes.ReindexResponse)
      );
      client.tasks.get.mockResolvedValue(
        elasticsearchClientMock.createSuccessTransportRequestPromise({
          completed: true,
        } as estypes.TaskGetResponse)
      );

      const info = {
        aliases: {},
        exists: true,
        indexName: '.ze-index',
        mappings: {
          dynamic: 'strict' as const,
          properties: { foo: { type: 'keyword' } },
        },
      } as const;

      await Index.convertToAlias(
        client,
        info,
        '.muchacha',
        10,
        `ctx._id = ctx._source.type + ':' + ctx._id`
      );

      expect(client.indices.create).toHaveBeenCalledWith({
        body: {
          mappings: {
            dynamic: 'strict',
            properties: { foo: { type: 'keyword' } },
          },
          settings: { auto_expand_replicas: '0-1', number_of_shards: 1 },
        },
        index: '.ze-index',
      });

      expect(client.reindex).toHaveBeenCalledWith({
        body: {
          dest: { index: '.ze-index' },
          source: { index: '.muchacha', size: 10 },
          script: {
            source: `ctx._id = ctx._source.type + ':' + ctx._id`,
            lang: 'painless',
          },
        },
        refresh: true,
        wait_for_completion: false,
      });

      expect(client.tasks.get).toHaveBeenCalledWith({
        task_id: 'abc',
      });

      expect(client.indices.updateAliases).toHaveBeenCalledWith({
        body: {
          actions: [
            { remove_index: { index: '.muchacha' } },
            { remove: { alias: '.muchacha', index: '.my-fanci-index' } },
            { add: { index: '.ze-index', alias: '.muchacha' } },
          ],
        },
      });

      expect(client.indices.refresh).toHaveBeenCalledWith({
        index: '.ze-index',
      });
    });

    test('throws error if re-index task fails', async () => {
      client.indices.getAlias.mockResolvedValue(
        elasticsearchClientMock.createSuccessTransportRequestPromise({
          '.my-fanci-index': { aliases: { '.muchacha': {} } },
        })
      );
      client.reindex.mockResolvedValue(
        elasticsearchClientMock.createSuccessTransportRequestPromise({
          task: 'abc',
        } as estypes.ReindexResponse)
      );
      client.tasks.get.mockResolvedValue(
        // @ts-expect-error @elastic/elasticsearch GetTaskResponse requires a `task` property even on errors
        elasticsearchClientMock.createSuccessTransportRequestPromise({
          completed: true,
          error: {
            type: 'search_phase_execution_exception',
            reason: 'all shards failed',
            failed_shards: [],
          },
        } as estypes.TaskGetResponse)
      );

      const info = {
        aliases: {},
        exists: true,
        indexName: '.ze-index',
        mappings: {
          dynamic: 'strict',
          properties: { foo: { type: 'keyword' } },
        },
      };

      // @ts-expect-error
      await expect(Index.convertToAlias(client, info, '.muchacha', 10)).rejects.toThrow(
        /Re-index failed \[search_phase_execution_exception\] all shards failed/
      );

      expect(client.indices.create).toHaveBeenCalledWith({
        body: {
          mappings: {
            dynamic: 'strict',
            properties: { foo: { type: 'keyword' } },
          },
          settings: { auto_expand_replicas: '0-1', number_of_shards: 1 },
        },
        index: '.ze-index',
      });

      expect(client.reindex).toHaveBeenCalledWith({
        body: {
          dest: { index: '.ze-index' },
          source: { index: '.muchacha', size: 10 },
        },
        refresh: true,
        wait_for_completion: false,
      });

      expect(client.tasks.get).toHaveBeenCalledWith({
        task_id: 'abc',
      });
    });
  });

  describe('write', () => {
    test('writes documents in bulk to the index', async () => {
      client.bulk.mockResolvedValue(
        elasticsearchClientMock.createSuccessTransportRequestPromise({
          items: [] as any[],
        } as estypes.BulkResponse)
      );

      const index = '.myalias';
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

      await Index.write(client, index, docs);

      expect(client.bulk).toHaveBeenCalled();
      expect(client.bulk.mock.calls[0]).toMatchSnapshot();
    });

    test('fails if any document fails', async () => {
      client.bulk.mockResolvedValue(
        elasticsearchClientMock.createSuccessTransportRequestPromise({
          items: [{ index: { error: { type: 'shazm', reason: 'dern' } } }],
        } as estypes.BulkResponse)
      );

      const index = '.myalias';
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

      await expect(Index.write(client as any, index, docs)).rejects.toThrow(/dern/);
      expect(client.bulk).toHaveBeenCalledTimes(1);
    });
  });

  describe('reader', () => {
    test('returns docs in batches', async () => {
      const index = '.myalias';
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

      client.search = jest.fn().mockReturnValue(
        elasticsearchClientMock.createSuccessTransportRequestPromise({
          _scroll_id: 'x',
          _shards: { success: 1, total: 1 },
          hits: { hits: _.cloneDeep(batch1) },
        })
      );
      client.scroll = jest
        .fn()
        .mockReturnValueOnce(
          elasticsearchClientMock.createSuccessTransportRequestPromise({
            _scroll_id: 'y',
            _shards: { success: 1, total: 1 },
            hits: { hits: _.cloneDeep(batch2) },
          })
        )
        .mockReturnValueOnce(
          elasticsearchClientMock.createSuccessTransportRequestPromise({
            _scroll_id: 'z',
            _shards: { success: 1, total: 1 },
            hits: { hits: [] },
          })
        );

      const read = Index.reader(client, index, { batchSize: 100, scrollDuration: '5m' });

      expect(await read()).toEqual(batch1);
      expect(await read()).toEqual(batch2);
      expect(await read()).toEqual([]);

      expect(client.search).toHaveBeenCalledWith({
        body: {
          size: 100,
          query: Index.excludeUnusedTypesQuery,
        },
        index,
        scroll: '5m',
      });
      expect(client.scroll).toHaveBeenCalledWith({
        scroll: '5m',
        scroll_id: 'x',
      });
      expect(client.scroll).toHaveBeenCalledWith({
        scroll: '5m',
        scroll_id: 'y',
      });
      expect(client.clearScroll).toHaveBeenCalledWith({
        scroll_id: 'z',
      });
    });

    test('returns all root-level properties', async () => {
      const index = '.myalias';
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

      client.search = jest.fn().mockReturnValueOnce(
        elasticsearchClientMock.createSuccessTransportRequestPromise({
          _scroll_id: 'x',
          _shards: { success: 1, total: 1 },
          hits: { hits: _.cloneDeep(batch) },
        })
      );
      client.scroll = jest.fn().mockReturnValueOnce(
        elasticsearchClientMock.createSuccessTransportRequestPromise({
          _scroll_id: 'z',
          _shards: { success: 1, total: 1 },
          hits: { hits: [] },
        })
      );

      const read = Index.reader(client, index, {
        batchSize: 100,
        scrollDuration: '5m',
      });

      expect(await read()).toEqual(batch);
    });

    test('fails if not all shards were successful', async () => {
      const index = '.myalias';

      client.search = jest.fn().mockReturnValueOnce(
        elasticsearchClientMock.createSuccessTransportRequestPromise({
          _shards: { successful: 1, total: 2 },
        })
      );

      const read = Index.reader(client, index, {
        batchSize: 100,
        scrollDuration: '5m',
      });

      await expect(read()).rejects.toThrow(/shards failed/);
    });

    test('handles shards not being returned', async () => {
      const index = '.myalias';
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

      client.search = jest.fn().mockReturnValueOnce(
        elasticsearchClientMock.createSuccessTransportRequestPromise({
          _scroll_id: 'x',
          hits: { hits: _.cloneDeep(batch) },
        })
      );
      client.scroll = jest.fn().mockReturnValueOnce(
        elasticsearchClientMock.createSuccessTransportRequestPromise({
          _scroll_id: 'z',
          hits: { hits: [] },
        })
      );

      const read = Index.reader(client, index, {
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
      kibanaVersion,
    }: any) {
      client.indices.get = jest.fn().mockReturnValueOnce(
        elasticsearchClientMock.createSuccessTransportRequestPromise({
          [index]: { mappings },
        })
      );
      client.count = jest.fn().mockReturnValueOnce(
        elasticsearchClientMock.createSuccessTransportRequestPromise({
          count,
          _shards: { success: 1, total: 1 },
        })
      );

      const hasMigrations = await Index.migrationsUpToDate(
        client,
        index,
        migrations,
        kibanaVersion
      );
      return { hasMigrations };
    }

    test('is false if the index mappings do not contain migrationVersion', async () => {
      const { hasMigrations } = await testMigrationsUpToDate({
        index: '.myalias',
        mappings: {
          properties: {
            dashboard: { type: 'text' },
          },
        },
        count: 0,
        migrations: { dashy: '2.3.4' },
        kibanaVersion: '7.10.0',
      });

      expect(hasMigrations).toBeFalsy();
      expect(client.indices.get).toHaveBeenCalledWith(
        {
          index: '.myalias',
        },
        {
          ignore: [404],
        }
      );
    });

    test('is true if there are no migrations defined', async () => {
      const { hasMigrations } = await testMigrationsUpToDate({
        index: '.myalias',
        mappings: {
          properties: {
            migrationVersion: {
              dynamic: 'true',
              type: 'object',
            },
            dashboard: { type: 'text' },
          },
        },
        count: 2,
        migrations: {},
        kibanaVersion: '7.10.0',
      });

      expect(hasMigrations).toBeTruthy();
      expect(client.indices.get).toHaveBeenCalledTimes(1);
    });

    test('is true if there are no documents out of date', async () => {
      const { hasMigrations } = await testMigrationsUpToDate({
        index: '.myalias',
        mappings: {
          properties: {
            migrationVersion: {
              dynamic: 'true',
              type: 'object',
            },
            dashboard: { type: 'text' },
          },
        },
        count: 0,
        migrations: { dashy: '23.2.5' },
      });

      expect(hasMigrations).toBeTruthy();
      expect(client.indices.get).toHaveBeenCalledTimes(1);
      expect(client.count).toHaveBeenCalledTimes(1);
    });

    test('is false if there are documents out of date', async () => {
      const { hasMigrations } = await testMigrationsUpToDate({
        index: '.myalias',
        mappings: {
          properties: {
            migrationVersion: {
              dynamic: 'true',
              type: 'object',
            },
            dashboard: { type: 'text' },
          },
        },
        count: 3,
        migrations: { dashy: '23.2.5' },
        kibanaVersion: '7.10.0',
      });

      expect(hasMigrations).toBeFalsy();
      expect(client.indices.get).toHaveBeenCalledTimes(1);
      expect(client.count).toHaveBeenCalledTimes(1);
    });

    test('counts docs that are out of date', async () => {
      await testMigrationsUpToDate({
        index: '.myalias',
        mappings: {
          properties: {
            migrationVersion: {
              dynamic: 'true',
              type: 'object',
            },
            dashboard: { type: 'text' },
          },
        },
        count: 0,
        migrations: {
          dashy: '23.2.5',
          bashy: '99.9.3',
          flashy: '3.4.5',
        },
        kibanaVersion: '7.10.0',
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

      expect(client.count).toHaveBeenCalledWith({
        body: {
          query: {
            bool: {
              should: [
                shouldClause('dashy', '23.2.5'),
                shouldClause('bashy', '99.9.3'),
                shouldClause('flashy', '3.4.5'),
                {
                  bool: {
                    must_not: {
                      term: {
                        coreMigrationVersion: '7.10.0',
                      },
                    },
                  },
                },
              ],
            },
          },
        },
        index: '.myalias',
      });
    });
  });
});
