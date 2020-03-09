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

jest.mock('../../plugins/plugins_service');
import {
  TestElasticsearchUtils,
  createTestServers,
  createRootWithCorePlugins,
} from '../../../../test_utils/kbn_server';
import { PluginsService } from '../../plugins/plugins_service';

describe('saved object migrations', () => {
  describe('dry run', () => {
    let ES: TestElasticsearchUtils | undefined;
    beforeAll(async () => {
      const { startES } = createTestServers({
        adjustTimeout: t => jest.setTimeout(t),
      });

      ES = await startES();
    });

    afterAll(async () => {
      await ES!.stop();
    });

    afterEach(async () => {
      await ES!.es
        .getClient()
        .indices.delete({ index: '.kibana' })
        .catch(e => {});
      await ES!.es
        .getClient()
        .indices.delete({ index: '.kibana_1' })
        .catch(e => {});

      await ES!.es.getClient().indices.flush({ index: '*' });
    });

    it('skips dry run if saved objects alias does not exists', async () => {
      expect.assertions(1);
      const root = createRootWithCorePlugins({}, { dryRunMigration: true });
      await root.setup();
      await root.start();
      const indices = await ES!.es.getClient().cat.indices({ format: 'json' });
      expect(indices).toEqual([]);
      await root.shutdown();
    });

    it('skips dry run if saved objects alias is an index instead of an alias', async () => {
      // Dry run migrations don't support indices from 6.x where `.kibana` was
      // an index instead of an alias.
      expect.assertions(2);
      const mappings = {
        properties: {
          dashboard: { properties: { title: { type: 'keyword' } }, dynamic: 'true' },
        },
      };
      // Create an *index* `.kibana` with some mappings
      await ES!.es.getClient().indices.create({
        index: '.kibana',
        body: {
          mappings,
        },
      });

      // Perform dry run migration
      const root = createRootWithCorePlugins({}, { dryRunMigration: true });
      await root.setup();
      await root.start();
      await root.shutdown();

      // Assert that index and it's mappings are untouched after the dry run migration
      const indices = (await ES!.es
        .getClient()
        .cat.indices({ index: '.kibana*', format: 'json' })) as [
        { index: string; 'docs.count': number }
      ];
      expect(indices.map(i => ({ index: i.index, docs: i['docs.count'] }))).toEqual([
        { docs: '0', index: '.kibana' },
      ]);
      expect(await ES!.es.getClient().indices.getMapping({ index: '.kibana' })).toEqual({
        '.kibana': { mappings },
      });
    });

    it('leaves existing indexes untouched and cleans up dry run indices', async () => {
      expect.assertions(3);
      const mappings = {
        properties: {
          dashboard: { properties: { title: { type: 'keyword' } }, dynamic: 'true' },
        },
      };
      // Create an index/alias with incorrect mappings which would have
      // triggered a migration to fix the mappings if dryRunMigration=false
      await ES!.es.getClient().indices.create({
        index: '.kibana_1',
        body: {
          mappings,
          aliases: { '.kibana': {} },
        },
      });

      // Perform dry run migration
      const root = createRootWithCorePlugins({}, { dryRunMigration: true });
      await root.setup();
      await root.start();
      await root.shutdown();

      // Assert that index and it's mappings are untouched after the dry run migration
      const indices = (await ES!.es
        .getClient()
        .cat.indices({ index: '.kibana*', format: 'json' })) as [
        { index: string; 'docs.count': number }
      ];
      expect(indices.map(i => ({ index: i.index, docs: i['docs.count'] }))).toEqual([
        { docs: '0', index: '.kibana_1' },
      ]);
      expect(await ES!.es.getClient().indices.getMapping({ index: '.kibana_1' })).toEqual({
        '.kibana_1': { mappings },
      });

      // Assert that alias is untouched after dry run migration
      expect(await ES!.es.getClient().cat.aliases({ format: 'json' })).toMatchInlineSnapshot(`
        Array [
          Object {
            "alias": ".kibana",
            "filter": "-",
            "index": ".kibana_1",
            "is_write_index": "-",
            "routing.index": "-",
            "routing.search": "-",
          },
        ]
      `);
    });

    it('does not start plugins', async () => {
      expect.assertions(2);
      const root = createRootWithCorePlugins({}, { dryRunMigration: true });
      const pluginService = new PluginsService({} as any);
      await root.setup();
      expect(pluginService.setup).toHaveBeenCalled();
      await root.start();
      expect(pluginService.start).not.toHaveBeenCalled();
      await root.shutdown();
    });
  });
});
