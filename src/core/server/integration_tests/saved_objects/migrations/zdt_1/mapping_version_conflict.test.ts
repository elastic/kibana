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
import {
  getBaseMigratorParams,
  getFooType,
  getBarType,
  dummyModelVersion,
} from '../fixtures/zdt_base.fixtures';

export const logFilePath = Path.join(__dirname, 'mapping_version_conflict.test.log');

describe('ZDT upgrades - mapping model version conflict', () => {
  let esServer: TestElasticsearchUtils['es'];

  const baseMigratorParams = getBaseMigratorParams({ kibanaVersion: '8.8.0' });

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

    // increasing bar model version on the baseline
    barType.modelVersions = {
      ...barType.modelVersions,
      '2': dummyModelVersion,
    };
    barType.mappings.properties = {
      ...barType.mappings.properties,
      anotherAddedField: { type: 'boolean' },
    };
    const { runMigrations } = await getKibanaMigratorTestKit({
      ...baseMigratorParams,
      types: [fooType, barType],
    });
    await runMigrations();
  };

  it('fails the migration with an error', async () => {
    await createBaseline();

    const fooType = getFooType();
    const barType = getBarType();

    // increasing foo model version
    fooType.modelVersions = {
      ...fooType.modelVersions,
      '3': dummyModelVersion,
    };
    fooType.mappings.properties = {
      ...fooType.mappings.properties,
      someAddedField: { type: 'keyword' },
    };

    // we have the following versions:
    // baseline : bar:2, foo: 2
    // upgrade: bar:3, foo:1
    // which should cause a migration failure.

    const { runMigrations, client } = await getKibanaMigratorTestKit({
      ...baseMigratorParams,
      logFilePath,
      types: [fooType, barType],
    });

    await expect(runMigrations()).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Unable to complete saved object migrations for the [.kibana] index: Model version conflict: inconsistent higher/lower versions"`
    );

    const indices = await client.indices.get({ index: '.kibana*' });

    expect(Object.keys(indices)).toEqual(['.kibana_1']);

    const index = indices['.kibana_1'];
    const aliases = Object.keys(index.aliases ?? {}).sort();
    const mappings = index.mappings ?? {};
    const mappingMeta = mappings._meta ?? {};

    expect(aliases).toEqual(['.kibana', '.kibana_8.8.0']);

    expect(mappingMeta.mappingVersions).toEqual({
      foo: '10.2.0',
      bar: '10.2.0',
    });

    const records = await parseLogFile(logFilePath);

    expect(records).toContainLogEntry('INIT: mapping version check result: conflict');
    expect(records).toContainLogEntry('INIT -> FATAL');
  });
});
