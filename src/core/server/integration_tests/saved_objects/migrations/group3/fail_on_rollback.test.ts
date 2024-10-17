/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TestElasticsearchUtils } from '@kbn/core-test-helpers-kbn-server';
import {
  startElasticsearch,
  nextMinor,
  defaultKibanaIndex,
  defaultKibanaTaskIndex,
  currentVersion,
} from '../kibana_migrator_test_kit';
import '../jest_matchers';
import { delay } from '../test_utils';
import { getUpToDateMigratorTestKit } from '../kibana_migrator_test_kit.fixtures';
import { BASELINE_TEST_ARCHIVE_1K } from '../kibana_migrator_archive_utils';

describe('when rolling back to an older version', () => {
  let esServer: TestElasticsearchUtils['es'];

  beforeAll(async () => {
    esServer = await startElasticsearch({ dataArchive: BASELINE_TEST_ARCHIVE_1K });
  });

  it('kibana should detect that a later version alias exists, and abort', async () => {
    // migrate to next minor
    const { runMigrations: upgrade } = await getUpToDateMigratorTestKit();
    await upgrade();

    // run migrations for the current version again (simulate rollback)
    const { runMigrations: rollback } = await getUpToDateMigratorTestKit({
      kibanaVersion: currentVersion,
    });

    try {
      await rollback();
      throw new Error('Rollback should have thrown but it did not');
    } catch (error) {
      expect([
        `Unable to complete saved object migrations for the [${defaultKibanaIndex}] index: The ${defaultKibanaIndex}_${nextMinor} alias refers to a newer version of Kibana: v${nextMinor}`,
        `Unable to complete saved object migrations for the [${defaultKibanaTaskIndex}] index: The ${defaultKibanaTaskIndex}_${nextMinor} alias refers to a newer version of Kibana: v${nextMinor}`,
      ]).toContain(error.message);
    }
  });

  afterAll(async () => {
    await esServer?.stop();
    await delay(2);
  });
});
