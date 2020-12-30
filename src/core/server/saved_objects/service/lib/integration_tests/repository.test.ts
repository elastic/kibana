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

import { InternalCoreStart } from '../../../../internal_types';
import * as kbnTestServer from '../../../../../test_helpers/kbn_server';
import { Root } from '../../../../root';

const { startES } = kbnTestServer.createTestServers({
  adjustTimeout: (t: number) => jest.setTimeout(t),
});
let esServer: kbnTestServer.TestElasticsearchUtils;

describe('SavedObjectsRepository', () => {
  let root: Root;
  let start: InternalCoreStart;

  beforeAll(async () => {
    esServer = await startES();
    root = kbnTestServer.createRootWithCorePlugins({
      server: {
        basePath: '/hello',
      },
    });

    const setup = await root.setup();
    setup.savedObjects.registerType({
      hidden: false,
      mappings: {
        dynamic: false,
        properties: {},
      },
      name: 'test_counter_type',
      namespaceType: 'single',
    });
    start = await root.start();
  });

  afterAll(async () => {
    await esServer.stop();
    await root.shutdown();
  });

  describe('#incrementCounter', () => {
    describe('initialize=false', () => {
      it('creates a new document if none exists and sets all counter fields set to 1', async () => {
        const now = new Date().getTime();
        const repository = start.savedObjects.createInternalRepository();
        await repository.incrementCounter('test_counter_type', 'counter_1', [
          'stats.api.count',
          'stats.api.count2',
          'stats.total',
        ]);
        const result = await repository.get('test_counter_type', 'counter_1');
        expect(result.attributes).toMatchInlineSnapshot(`
          Object {
            "stats.api.count": 1,
            "stats.api.count2": 1,
            "stats.total": 1,
          }
        `);
        expect(Date.parse(result.updated_at!)).toBeGreaterThanOrEqual(now);
      });
      it('increments the specified counters of an existing document', async () => {
        const repository = start.savedObjects.createInternalRepository();
        // Create document
        await repository.incrementCounter('test_counter_type', 'counter_2', [
          'stats.api.count',
          'stats.api.count2',
          'stats.total',
        ]);

        const now = new Date().getTime();
        // Increment counters
        await repository.incrementCounter('test_counter_type', 'counter_2', [
          'stats.api.count',
          'stats.api.count2',
          'stats.total',
        ]);
        const result = await repository.get('test_counter_type', 'counter_2');
        expect(result.attributes).toMatchInlineSnapshot(`
          Object {
            "stats.api.count": 2,
            "stats.api.count2": 2,
            "stats.total": 2,
          }
        `);
        expect(Date.parse(result.updated_at!)).toBeGreaterThanOrEqual(now);
      });
    });
    describe('initialize=true', () => {
      it('creates a new document if none exists and sets all counter fields to 0', async () => {
        const now = new Date().getTime();
        const repository = start.savedObjects.createInternalRepository();
        await repository.incrementCounter(
          'test_counter_type',
          'counter_3',
          ['stats.api.count', 'stats.api.count2', 'stats.total'],
          { initialize: true }
        );
        const result = await repository.get('test_counter_type', 'counter_3');
        expect(result.attributes).toMatchInlineSnapshot(`
          Object {
            "stats.api.count": 0,
            "stats.api.count2": 0,
            "stats.total": 0,
          }
        `);
        expect(Date.parse(result.updated_at!)).toBeGreaterThanOrEqual(now);
      });
      it('sets any undefined counter fields to 0 but does not alter existing fields of an existing document', async () => {
        const repository = start.savedObjects.createInternalRepository();
        // Create document
        await repository.incrementCounter('test_counter_type', 'counter_4', [
          'stats.existing_field',
        ]);

        const now = new Date().getTime();
        // Initialize counters
        await repository.incrementCounter(
          'test_counter_type',
          'counter_4',
          ['stats.existing_field', 'stats.new_field'],
          { initialize: true }
        );
        const result = await repository.get('test_counter_type', 'counter_4');
        expect(result.attributes).toMatchInlineSnapshot(`
          Object {
            "stats.existing_field": 1,
            "stats.new_field": 0,
          }
        `);
        expect(Date.parse(result.updated_at!)).toBeGreaterThanOrEqual(now);
      });
    });
  });
});
