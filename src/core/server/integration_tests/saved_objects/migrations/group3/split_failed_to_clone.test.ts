/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { join } from 'path';
import type { TestElasticsearchUtils } from '@kbn/core-test-helpers-kbn-server';
import type { CloneIndexParams } from '@kbn/core-saved-objects-migration-server-internal/src/actions';

import {
  clearLog,
  startElasticsearch,
  getAggregatedTypesCount,
  type KibanaMigratorTestKit,
  defaultKibanaTaskIndex,
  defaultKibanaIndex,
} from '../kibana_migrator_test_kit';
import { BASELINE_TEST_ARCHIVE_1K } from '../kibana_migrator_archive_utils';
import {
  getRelocatingMigratorTestKit,
  kibanaSplitIndex,
} from '../kibana_migrator_test_kit.fixtures';
import { delay } from '../test_utils';
import '../jest_matchers';

// mock clone_index from src/core/packages/saved-objects
jest.mock('@kbn/core-saved-objects-migration-server-internal/src/actions/clone_index', () => {
  const realModule = jest.requireActual(
    '@kbn/core-saved-objects-migration-server-internal/src/actions/clone_index'
  );
  return {
    ...realModule,
    cloneIndex: (params: CloneIndexParams) => async () => {
      // we need to slow down the clone operation for indices other than
      // .kibana_migrator so that .kibana_migrator can completely finish the migration before we
      // fail
      if (!params.target.includes('tasks') && !params.target.includes('new'))
        await new Promise((resolve) => setTimeout(resolve, 2000));
      return realModule.cloneIndex(params)();
    },
  };
});

export const logFilePath = join(__dirname, 'split_failed_to_clone.test.log');

describe('when splitting .kibana into multiple indices and one clone fails', () => {
  let esServer: TestElasticsearchUtils['es'];
  let migratorTestKitFactory: () => Promise<KibanaMigratorTestKit>;

  beforeAll(async () => {
    await clearLog(logFilePath);
    esServer = await startElasticsearch({ dataArchive: BASELINE_TEST_ARCHIVE_1K });
  });

  afterAll(async () => {
    await esServer?.stop();
    await delay(2);
  });

  it('after resolving the problem and retrying the migration completes successfully', async () => {
    migratorTestKitFactory = () =>
      getRelocatingMigratorTestKit({
        logFilePath,
        filterDeprecated: true,
        relocateTypes: {
          // move 'basic' to a new index
          basic: kibanaSplitIndex,
        },
      });

    const { runMigrations: runMigrationsWhichFailsWhenCloning, client } =
      await migratorTestKitFactory();

    // ensure we have a valid 'before' state
    expect(await getAggregatedTypesCount(client, defaultKibanaIndex)).toEqual({
      basic: 200,
      complex: 200,
      deprecated: 200,
      server: 200,
    });
    expect(await getAggregatedTypesCount(client, defaultKibanaTaskIndex)).toEqual({
      task: 200,
    });
    expect(await getAggregatedTypesCount(client, kibanaSplitIndex)).toEqual({});

    // cause a failure when cloning .kibana_slow_clone_* indices
    await client.cluster.putSettings({ persistent: { 'cluster.max_shards_per_node': 6 } });

    await expect(runMigrationsWhichFailsWhenCloning()).rejects.toThrowError(
      /cluster_shard_limit_exceeded/
    );

    // remove the failure
    await client.cluster.putSettings({ persistent: { 'cluster.max_shards_per_node': 150 } });

    const { runMigrations: runMigrations2ndTime } = await migratorTestKitFactory();
    await runMigrations2ndTime();

    // ensure we have a valid 'after' state
    expect(await getAggregatedTypesCount(client, defaultKibanaIndex)).toEqual({
      complex: 99,
    });
    expect(await getAggregatedTypesCount(client, defaultKibanaTaskIndex)).toEqual({
      task: 200,
    });
    expect(await getAggregatedTypesCount(client, kibanaSplitIndex)).toEqual({
      basic: 200,
    });

    // If we run a third time, we should not get any errors
    const { runMigrations: runMigrations3rdTime } = await migratorTestKitFactory();
    await runMigrations3rdTime();
  });
});
