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
import { range } from 'lodash';
import '../jest_matchers';
import { type TestElasticsearchUtils } from '@kbn/core-test-helpers-kbn-server';
import {
  deleteSavedObjectIndices,
  getKibanaMigratorTestKit,
  startElasticsearch,
} from '@kbn/migrator-test-kit';
import {
  dummyModelVersion,
  getBaseMigratorParams,
  getFooType,
} from '../fixtures/zdt_base.fixtures';
import { createType, parseLogFile } from '../test_utils';

const logFilePath = Path.join(__dirname, 'unknown_documents.test.log');

const getLegacyType = () =>
  createType({
    name: 'legacy',
    mappings: { properties: { name: { type: 'keyword' } } },
    modelVersions: { 1: { changes: [] } },
  });

/** `foo`, with a new model version: the cleanup only runs when the documents model versions change. */
const getUpdatedFooType = () => {
  const fooType = getFooType();
  return { ...fooType, modelVersions: { ...fooType.modelVersions, 3: dummyModelVersion } };
};

/** On 9.5.0, the `legacy` type is no longer registered: its documents are unknown. */
const getMigrator = (kibanaVersion: string, discardUnknownObjects?: string) => {
  const { settings, ...params } = getBaseMigratorParams({
    migrationAlgorithm: 'v3',
    kibanaVersion,
  });
  return getKibanaMigratorTestKit({
    ...params,
    settings: { ...settings, migrations: { ...settings?.migrations, discardUnknownObjects } },
    logFilePath,
    types: kibanaVersion === '9.4.0' ? [getFooType(), getLegacyType()] : [getUpdatedFooType()],
  });
};

describe('v3 migrations - unknown documents', () => {
  let esServer: TestElasticsearchUtils['es'];

  const countByType = async (type: string) => {
    const { client } = await getMigrator('9.5.0');
    const { count } = await client.count({ index: '.kibana', query: { term: { type } } });
    return count;
  };

  beforeAll(async () => {
    esServer = await startElasticsearch();
  });

  afterAll(async () => {
    await esServer?.stop();
  });

  beforeEach(async () => {
    await fs.unlink(logFilePath).catch(() => {});
    const baseline = await getMigrator('9.4.0');
    await baseline.runMigrations();
    await baseline.savedObjectsRepository.bulkCreate<{ someField?: string; name?: string }>(
      range(2).flatMap((index) => [
        { id: `foo-${index}`, type: 'foo', attributes: { someField: `${index}` } },
        { id: `legacy-${index}`, type: 'legacy', attributes: { name: `${index}` } },
      ]),
      { refresh: 'wait_for' }
    );
    await fs.unlink(logFilePath);
  });

  afterEach(async () => {
    const { client } = await getMigrator('9.5.0');
    await deleteSavedObjectIndices(client, ['.kibana*']);
  });

  it('keeps them, and warns about them, when discardUnknownObjects is unset', async () => {
    await (await getMigrator('9.5.0')).runMigrations();

    expect(await countByType('legacy')).toBe(2);
    expect(await countByType('foo')).toBe(2);
    const records = await parseLogFile(logFilePath);
    expect(records).toContainLogEntry(
      'contains documents of unknown types, which have been kept: legacy (2)'
    );
  });

  it('keeps them, and warns about the flag, when discardUnknownObjects targets another version', async () => {
    await (await getMigrator('9.5.0', '9.4.0')).runMigrations();

    expect(await countByType('legacy')).toBe(2);
    const records = await parseLogFile(logFilePath);
    expect(records).toContainLogEntry(
      'The flag `migrations.discardUnknownObjects` is defined but does not match the current kibana version'
    );
  });

  it('deletes them when discardUnknownObjects matches the Kibana version', async () => {
    await (await getMigrator('9.5.0', '9.5.0')).runMigrations();

    expect(await countByType('legacy')).toBe(0);
    expect(await countByType('foo')).toBe(2);
  });
});
