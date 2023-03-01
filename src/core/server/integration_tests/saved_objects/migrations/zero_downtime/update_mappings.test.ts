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
import {
  getKibanaMigratorTestKit,
  type KibanaMigratorTestKitParams,
} from '../kibana_migrator_test_kit';
import { delay } from '../test_utils';
import { getFooType, getBarType, dummyModelVersion } from './base_types.fixtures';

export const logFilePath = Path.join(__dirname, 'update_mappings.test.log');

describe('ZDT upgrades - basic mapping update', () => {
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

  const baseMigratorParams: KibanaMigratorTestKitParams = {
    kibanaIndex: '.kibana',
    kibanaVersion: '8.7.0',
    settings: {
      migrations: {
        algorithm: 'zdt',
      },
    },
  };

  beforeAll(async () => {
    await fs.unlink(logFilePath).catch(() => {});
    esServer = await startElasticsearch();
  });

  afterAll(async () => {
    await esServer?.stop();
    await delay(10);
  });

  const createBaseline = async () => {
    const fooType = getFooType();
    const barType = getBarType();
    const { runMigrations } = await getKibanaMigratorTestKit({
      ...baseMigratorParams,
      types: [fooType, barType],
    });
    await runMigrations();
  };

  it('updates the mappings and the meta', async () => {
    await createBaseline();

    const fooType = getFooType();
    const barType = getBarType();

    // increasing the model version of the types
    fooType.modelVersions = {
      ...fooType.modelVersions,
      '3': dummyModelVersion,
    };
    fooType.mappings.properties = {
      ...fooType.mappings.properties,
      someAddedField: { type: 'keyword' },
    };

    barType.modelVersions = {
      ...barType.modelVersions,
      '2': dummyModelVersion,
    };
    barType.mappings.properties = {
      ...barType.mappings.properties,
      anotherAddedField: { type: 'boolean' },
    };

    const { runMigrations, client } = await getKibanaMigratorTestKit({
      ...baseMigratorParams,
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

    expect(aliases).toEqual(['.kibana', '.kibana_8.7.0']);

    expect(mappings.properties).toEqual(
      expect.objectContaining({
        foo: fooType.mappings,
        bar: barType.mappings,
      })
    );

    expect(mappingMeta).toEqual({
      // doc migration not implemented yet - docVersions are not bumped.
      docVersions: {
        foo: 2,
        bar: 1,
      },
      mappingVersions: {
        foo: 3,
        bar: 2,
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

    expectLogsContains('INIT -> UPDATE_INDEX_MAPPINGS');
    expectLogsContains('UPDATE_INDEX_MAPPINGS -> UPDATE_INDEX_MAPPINGS_WAIT_FOR_TASK');
    expectLogsContains('UPDATE_INDEX_MAPPINGS_WAIT_FOR_TASK -> UPDATE_MAPPING_MODEL_VERSIONS');
    expectLogsContains('UPDATE_MAPPING_MODEL_VERSIONS -> DONE');
    expectLogsContains('Migration completed');
  });
});
