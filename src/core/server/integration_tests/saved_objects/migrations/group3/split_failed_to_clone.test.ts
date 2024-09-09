/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import type { TestElasticsearchUtils } from '@kbn/core-test-helpers-kbn-server';
import {
  type ISavedObjectTypeRegistry,
  type SavedObjectsType,
  MAIN_SAVED_OBJECT_INDEX,
} from '@kbn/core-saved-objects-server';
import { DEFAULT_INDEX_TYPES_MAP } from '@kbn/core-saved-objects-base-server-internal';
import type { CloneIndexParams } from '@kbn/core-saved-objects-migration-server-internal/src/actions';

import {
  clearLog,
  startElasticsearch,
  getKibanaMigratorTestKit,
  getCurrentVersionTypeRegistry,
  overrideTypeRegistry,
  getAggregatedTypesCount,
  type KibanaMigratorTestKit,
} from '../kibana_migrator_test_kit';
import { delay } from '../test_utils';
import '../jest_matchers';

// mock clone_index from packages/core
jest.mock('@kbn/core-saved-objects-migration-server-internal/src/actions/clone_index', () => {
  const realModule = jest.requireActual(
    '@kbn/core-saved-objects-migration-server-internal/src/actions/clone_index'
  );
  return {
    ...realModule,
    cloneIndex: (params: CloneIndexParams) => async () => {
      // we need to slow down the clone operation for indices other than
      // .kibana so that .kibana can completely finish the migration before we
      // fail
      if (params.target.includes('slow_clone'))
        await new Promise((resolve) => setTimeout(resolve, 1000));
      return realModule.cloneIndex(params)();
    },
  };
});

// define a type => index distribution
const RELOCATE_TYPES: Record<string, string> = {
  dashboard: '.kibana_slow_clone_1',
  visualization: '.kibana_slow_clone_1',
  'canvas-workpad': '.kibana_slow_clone_1',
  search: '.kibana_slow_clone_2',
  task: '.kibana_task_manager_new', // force reindex
  'epm-packages-assets': '.kibana_slow_clone_1',
  // the remaining types will be forced to go to '.kibana',
  // overriding `indexPattern: foo` defined in the registry
};

export const logFilePath = Path.join(__dirname, 'split_failed_to_clone.test.log');

describe('when splitting .kibana into multiple indices and one clone fails', () => {
  let esServer: TestElasticsearchUtils['es'];
  let typeRegistry: ISavedObjectTypeRegistry;
  let migratorTestKitFactory: () => Promise<KibanaMigratorTestKit>;

  beforeAll(async () => {
    typeRegistry = await getCurrentVersionTypeRegistry({ oss: false });
    await clearLog(logFilePath);
    esServer = await startElasticsearch({
      dataArchive: Path.join(__dirname, '..', 'archives', '7.14.0_xpack_sample_saved_objects.zip'),
      timeout: 60000,
    });
  });

  afterAll(async () => {
    await esServer?.stop();
    await delay(2);
  });

  it('after resolving the problem and retrying the migration completes successfully', async () => {
    const updatedTypeRegistry = overrideTypeRegistry(
      typeRegistry,
      (type: SavedObjectsType<any>) => {
        return {
          ...type,
          indexPattern: RELOCATE_TYPES[type.name] ?? MAIN_SAVED_OBJECT_INDEX,
        };
      }
    );

    migratorTestKitFactory = () =>
      getKibanaMigratorTestKit({
        types: updatedTypeRegistry.getAllTypes(),
        kibanaIndex: '.kibana',
        logFilePath,
        defaultIndexTypesMap: DEFAULT_INDEX_TYPES_MAP,
      });

    const { runMigrations: runMigrationsWhichFailsWhenCloning, client } =
      await migratorTestKitFactory();

    // count of types in the legacy index
    expect(await getAggregatedTypesCount(client, '.kibana')).toEqual({
      'apm-telemetry': 1,
      application_usage_daily: 4,
      'canvas-workpad': 3,
      'canvas-workpad-template': 5,
      config: 1,
      'core-usage-stats': 1,
      dashboard: 19,
      'epm-packages': 3,
      'epm-packages-assets': 293,
      event_loop_delays_daily: 1,
      'graph-workspace': 3,
      'index-pattern': 5,
      'ingest-agent-policies': 2,
      'ingest-outputs': 1,
      'ingest-package-policies': 2,
      ingest_manager_settings: 1,
      map: 3,
      'osquery-usage-metric': 1,
      'sample-data-telemetry': 3,
      search: 14,
      space: 1,
      'spaces-usage-stats': 1,
      telemetry: 1,
      'ui-metric': 5,
      'usage-counters': 4,
      visualization: 173,
    });

    // cause a failure when cloning .kibana_slow_clone_* indices
    await client.cluster.putSettings({ persistent: { 'cluster.max_shards_per_node': 15 } });

    await expect(runMigrationsWhichFailsWhenCloning()).rejects.toThrowError(
      /cluster_shard_limit_exceeded/
    );

    // remove the failure
    await client.cluster.putSettings({ persistent: { 'cluster.max_shards_per_node': 150 } });

    const { runMigrations: runMigrations2ndTime } = await migratorTestKitFactory();
    await runMigrations2ndTime();

    expect(await getAggregatedTypesCount(client, '.kibana')).toMatchInlineSnapshot(`
      Object {
        "apm-telemetry": 1,
        "application_usage_daily": 4,
        "canvas-workpad-template": 5,
        "config": 1,
        "core-usage-stats": 1,
        "epm-packages": 3,
        "event_loop_delays_daily": 1,
        "graph-workspace": 3,
        "index-pattern": 5,
        "ingest-agent-policies": 2,
        "ingest-outputs": 1,
        "ingest-package-policies": 2,
        "ingest_manager_settings": 1,
        "map": 3,
        "sample-data-telemetry": 3,
        "space": 1,
        "spaces-usage-stats": 1,
        "telemetry": 1,
        "ui-metric": 5,
        "usage-counters": 4,
      }
    `);
    expect(await getAggregatedTypesCount(client, '.kibana_slow_clone_1')).toMatchInlineSnapshot(`
      Object {
        "canvas-workpad": 3,
        "dashboard": 19,
        "epm-packages-assets": 293,
        "visualization": 173,
      }
    `);
    expect(await getAggregatedTypesCount(client, '.kibana_slow_clone_2')).toMatchInlineSnapshot(`
      Object {
        "search": 14,
      }
    `);

    // If we run a third time, we should not get any errors
    const { runMigrations: runMigrations3rdTime } = await migratorTestKitFactory();
    await runMigrations3rdTime();
  });
});
