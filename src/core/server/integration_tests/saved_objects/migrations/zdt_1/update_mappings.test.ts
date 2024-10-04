/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import fs from 'fs/promises';
import { type TestElasticsearchUtils } from '@kbn/core-test-helpers-kbn-server';
import '../jest_matchers';
import { getKibanaMigratorTestKit, startElasticsearch } from '../kibana_migrator_test_kit';
import { parseLogFile } from '../test_utils';
import {
  getBaseMigratorParams,
  getFooType,
  getBarType,
  dummyModelVersion,
} from '../fixtures/zdt_base.fixtures';

export const logFilePath = Path.join(__dirname, 'update_mappings.test.log');

describe('ZDT upgrades - basic mapping update', () => {
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
    const barType = getBarType();
    const { runMigrations } = await getKibanaMigratorTestKit({
      ...getBaseMigratorParams({ kibanaVersion: '8.8.0' }),
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

    expect(mappingMeta.mappingVersions).toEqual({
      foo: '10.3.0',
      bar: '10.2.0',
    });

    const records = await parseLogFile(logFilePath);

    expect(records).toContainLogEntry('INIT -> UPDATE_INDEX_MAPPINGS');
    expect(records).toContainLogEntry(
      'UPDATE_INDEX_MAPPINGS -> UPDATE_INDEX_MAPPINGS_WAIT_FOR_TASK'
    );
    expect(records).toContainLogEntry(
      'UPDATE_INDEX_MAPPINGS_WAIT_FOR_TASK -> UPDATE_MAPPING_MODEL_VERSIONS'
    );
    expect(records).toContainLogEntry('UPDATE_MAPPING_MODEL_VERSIONS -> INDEX_STATE_UPDATE_DONE');
    expect(records).toContainLogEntry('Migration completed');
  });
});
