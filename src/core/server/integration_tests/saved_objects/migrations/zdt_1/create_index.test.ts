/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';
import fs from 'fs/promises';
import '../jest_matchers';
import { type TestElasticsearchUtils } from '@kbn/core-test-helpers-kbn-server';
import { getKibanaMigratorTestKit, startElasticsearch } from '../kibana_migrator_test_kit';
import { delay, parseLogFile } from '../test_utils';
import { getBaseMigratorParams, getFooType, getBarType } from '../fixtures/zdt_base.fixtures';

export const logFilePath = Path.join(__dirname, 'create_index.test.log');

describe('ZDT upgrades - running on a fresh cluster', () => {
  let esServer: TestElasticsearchUtils['es'];

  beforeAll(async () => {
    await fs.unlink(logFilePath).catch(() => {});
    esServer = await startElasticsearch();
  });

  afterAll(async () => {
    await esServer?.stop();
    await delay(10);
  });

  it('create the index with the correct mappings and meta', async () => {
    const fooType = getFooType();
    const barType = getBarType();

    const { runMigrations, client } = await getKibanaMigratorTestKit({
      ...getBaseMigratorParams({ kibanaVersion: '8.8.0' }),
      logFilePath,
      types: [fooType, barType],
    });

    const result = await runMigrations();

    expect(result).toEqual([
      {
        destIndex: '.kibana',
        elapsedMs: expect.any(Number),
        status: 'patched',
      },
    ]);

    const indices = await client.indices.get({ index: '.kibana*' });

    expect(Object.keys(indices)).toEqual(['.kibana_1']);

    const index = indices['.kibana_1'];
    const aliases = Object.keys(index.aliases ?? {}).sort();
    const mappings = index.mappings ?? {};
    const mappingMeta = mappings._meta ?? {};

    expect(aliases).toEqual(['.kibana', '.kibana_8.8.0']);

    expect(mappings.properties).toEqual(
      expect.objectContaining({
        foo: fooType.mappings,
        bar: barType.mappings,
      })
    );

    expect(mappingMeta).toEqual({
      docVersions: {
        foo: '10.2.0',
        bar: '10.1.0',
      },
      mappingVersions: {
        foo: '10.2.0',
        bar: '10.1.0',
      },
      migrationState: expect.objectContaining({
        convertingDocuments: false,
      }),
    });

    const records = await parseLogFile(logFilePath);

    expect(records).toContainLogEntry('INIT -> CREATE_TARGET_INDEX');
    expect(records).toContainLogEntry('CREATE_TARGET_INDEX -> UPDATE_ALIASES');
    expect(records).toContainLogEntry('UPDATE_ALIASES -> INDEX_STATE_UPDATE_DONE');
    expect(records).toContainLogEntry('INDEX_STATE_UPDATE_DONE -> DONE');
    expect(records).toContainLogEntry('Migration completed');
  });
});
