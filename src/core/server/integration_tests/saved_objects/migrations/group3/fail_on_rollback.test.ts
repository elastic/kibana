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
  clearLog,
  startElasticsearch,
  getKibanaMigratorTestKit,
  nextMinor,
  defaultKibanaIndex,
} from '../kibana_migrator_test_kit';
import '../jest_matchers';
import { delay, parseLogFile } from '../test_utils';
import { baselineTypes as types } from '../kibana_migrator_test_kit.fixtures';

export const logFilePath = Path.join(__dirname, 'fail_on_rollback.test.log');

describe('when rolling back to an older version', () => {
  let esServer: TestElasticsearchUtils['es'];

  beforeAll(async () => {
    esServer = await startElasticsearch();
  });

  beforeEach(async () => {});

  it('kibana should detect that a later version alias exists, and abort', async () => {
    // create a current version baseline
    const { runMigrations: createBaseline } = await getKibanaMigratorTestKit({
      types,
      logFilePath,
    });
    await createBaseline();

    // migrate to next minor
    const { runMigrations: upgrade } = await getKibanaMigratorTestKit({
      kibanaVersion: nextMinor,
      types,
      logFilePath,
    });
    await upgrade();

    // run migrations for the current version again (simulate rollback)
    const { runMigrations: rollback } = await getKibanaMigratorTestKit({ types, logFilePath });

    await clearLog(logFilePath);
    await expect(rollback()).rejects.toThrowError(
      `Unable to complete saved object migrations for the [${defaultKibanaIndex}] index: The ${defaultKibanaIndex}_${nextMinor} alias refers to a newer version of Kibana: v${nextMinor}`
    );

    const logs = await parseLogFile(logFilePath);
    expect(logs).toContainLogEntry('[.kibana_migrator_tests] INIT -> FATAL.');
  });

  afterAll(async () => {
    await esServer?.stop();
    await delay(2);
  });
});
