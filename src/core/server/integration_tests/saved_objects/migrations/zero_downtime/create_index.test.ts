/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';
import fs from 'fs/promises';
import JSON5 from 'json5';
import { LogRecord } from '@kbn/logging';
import { createTestServers, type TestElasticsearchUtils } from '@kbn/core-test-helpers-kbn-server';
import { getKibanaMigratorTestKit } from '../kibana_migrator_test_kit';
import { delay } from '../test_utils';
import { getFooType, getBarType } from './base_types.fixtures';

export const logFilePath = Path.join(__dirname, 'create_index.test.log');

describe('ZDT upgrades - running on a fresh cluster', () => {
  let esServer: TestElasticsearchUtils['es'];

  const startElasticsearch = async () => {
    const { startES } = createTestServers({
      adjustTimeout: (t: number) => jest.setTimeout(t),
      settings: {
        es: {
          license: 'basic',
        },
      },
    });
    return await startES();
  };

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
      kibanaIndex: '.kibana',
      kibanaVersion: '8.7.0',
      logFilePath,
      types: [fooType, barType],
      settings: {
        migrations: {
          algorithm: 'zdt',
        },
      },
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

    expect(aliases).toEqual(['.kibana', '.kibana_8.7.0']);

    expect(mappings.properties).toEqual(
      expect.objectContaining({
        foo: fooType.mappings,
        bar: barType.mappings,
      })
    );

    expect(mappingMeta).toEqual({
      docVersions: {
        foo: 2,
        bar: 1,
      },
      mappingVersions: {
        foo: 2,
        bar: 1,
      },
    });

    const logFileContent = await fs.readFile(logFilePath, 'utf-8');
    const records = logFileContent
      .split('\n')
      .filter(Boolean)
      .map((str) => JSON5.parse(str)) as LogRecord[];

    const expectLogsContains = (messagePrefix: string) => {
      expect(records.find((entry) => entry.message.includes(messagePrefix))).toBeDefined();
    };

    expectLogsContains('INIT -> CREATE_TARGET_INDEX');
    expectLogsContains('CREATE_TARGET_INDEX -> UPDATE_ALIASES');
    expectLogsContains('UPDATE_ALIASES -> DONE');
    expectLogsContains('Migration completed');
  });
});
