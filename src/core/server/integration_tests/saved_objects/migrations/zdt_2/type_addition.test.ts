/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';
import fs from 'fs/promises';
import { type TestElasticsearchUtils } from '@kbn/core-test-helpers-kbn-server';
import '../jest_matchers';
import { getKibanaMigratorTestKit, startElasticsearch } from '../kibana_migrator_test_kit';
import { parseLogFile } from '../test_utils';
import { getBaseMigratorParams, getFooType, getBarType } from '../fixtures/zdt_base.fixtures';

export const logFilePath = Path.join(__dirname, 'type_addition.test.log');

describe('ZDT upgrades - introducing a new SO type', () => {
  let esServer: TestElasticsearchUtils['es'];

  beforeAll(async () => {
    await fs.unlink(logFilePath).catch(() => {});
    esServer = await startElasticsearch();
  });

  afterAll(async () => {
    await esServer?.stop();
  });

  const createBaseline = async () => {
    const fooType = getFooType();
    const { runMigrations } = await getKibanaMigratorTestKit({
      ...getBaseMigratorParams(),
      types: [fooType],
    });
    await runMigrations();
  };

  it('should support adding the bar type', async () => {
    await createBaseline();

    const fooType = getFooType();
    const barType = getBarType();

    const { runMigrations } = await getKibanaMigratorTestKit({
      ...getBaseMigratorParams(),
      logFilePath,
      types: [fooType, barType],
    });

    await runMigrations();

    const records = await parseLogFile(logFilePath);

    expect(records).toContainLogEntries(
      [
        'mapping version check result: greater',
        'INIT -> UPDATE_INDEX_MAPPINGS',
        'INDEX_STATE_UPDATE_DONE -> DOCUMENTS_UPDATE_INIT',
        '-> DONE',
        'Migration completed',
      ],
      { ordered: true }
    );
  });
});
