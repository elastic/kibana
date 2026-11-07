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
import type { SavedObjectsType } from '@kbn/core-saved-objects-server';
import { type TestElasticsearchUtils } from '@kbn/core-test-helpers-kbn-server';
import {
  deleteSavedObjectIndices,
  getKibanaMigratorTestKit,
  startElasticsearch,
} from '@kbn/migrator-test-kit';
import {
  getBaseMigratorParams,
  getFooType,
  getBarType,
  dummyModelVersion,
} from '../fixtures/zdt_base.fixtures';

const logFilePath = Path.join(__dirname, 'on_demand_migrations.test.log');
const kibanaIndex = '.kibana';
const fooDocId = 'foo:1';

/** `foo`, with a 3rd model version adding and backfilling `newField`. */
const getUpdatedFooType = (): SavedObjectsType => {
  const fooType = getFooType();
  return {
    ...fooType,
    mappings: {
      properties: { ...fooType.mappings.properties, newField: { type: 'keyword' } },
    },
    modelVersions: {
      '1': dummyModelVersion,
      '2': dummyModelVersion,
      '3': {
        changes: [
          { type: 'mappings_addition', addedMappings: { newField: { type: 'keyword' } } },
          { type: 'data_backfill', backfillFn: () => ({ attributes: { newField: 'backfilled' } }) },
        ],
      },
    },
  };
};

describe('v3 migrations - on-demand migrations', () => {
  let esServer: TestElasticsearchUtils['es'];

  const getParams = ({
    kibanaVersion = '9.4.0',
    types = [getFooType(), getBarType()],
  }: { kibanaVersion?: string; types?: SavedObjectsType[] } = {}) => ({
    ...getBaseMigratorParams({ migrationAlgorithm: 'v3', kibanaVersion }),
    logFilePath,
    types,
  });

  beforeAll(async () => {
    await fs.unlink(logFilePath).catch(() => {});
    esServer = await startElasticsearch();
  });

  afterAll(async () => {
    await esServer?.stop();
  });

  afterEach(async () => {
    const { client } = await getKibanaMigratorTestKit(getParams());
    await deleteSavedObjectIndices(client, [`${kibanaIndex}*`]);
  });

  it('recreates the indices of a running Kibana, with concurrent callers', async () => {
    const { runMigrations, migrate, client } = await getKibanaMigratorTestKit(getParams());
    await runMigrations();
    const [initialIndex] = Object.values(await client.indices.get({ index: kibanaIndex }));

    await client.indices.delete({ index: `${kibanaIndex}_1` });

    const results = await Promise.all([migrate(), migrate(), migrate()]);
    results.forEach((result) =>
      expect(result).toEqual([
        expect.objectContaining({ status: 'patched', destIndex: kibanaIndex }),
      ])
    );

    const indices = await client.indices.get({ index: `${kibanaIndex}*` });
    expect(Object.keys(indices)).toEqual([`${kibanaIndex}_1`]);
    const { aliases = {}, mappings } = indices[`${kibanaIndex}_1`];
    expect(Object.keys(aliases).sort()).toEqual([kibanaIndex, `${kibanaIndex}_9.4.0`]);
    expect(mappings).toEqual(initialIndex.mappings);
  });

  it('leaves up-to-date indices untouched', async () => {
    const { runMigrations, initialize, migrate, client } = await getKibanaMigratorTestKit(
      getParams()
    );
    await runMigrations();
    const before = await client.indices.get({ index: `${kibanaIndex}*` });

    expect(await initialize()).toEqual([expect.objectContaining({ status: 'patched' })]);
    expect(await migrate()).toEqual([expect.objectContaining({ status: 'patched' })]);
    expect(await client.indices.get({ index: `${kibanaIndex}*` })).toEqual(before);
  });

  it('only updates the mappings and the aliases on initialize, and leaves the documents to migrate', async () => {
    const current = await getKibanaMigratorTestKit(getParams());
    await current.runMigrations();
    await current.savedObjectsRepository.create('foo', { someField: 'some value' }, { id: '1' });

    const { initialize, migrate, client, migrator } = await getKibanaMigratorTestKit(
      getParams({ kibanaVersion: '9.5.0', types: [getUpdatedFooType(), getBarType()] })
    );
    migrator.prepareMigrations();
    const getIndex = async () =>
      (await client.indices.get({ index: kibanaIndex }))[`${kibanaIndex}_1`];
    const getFooDoc = async () =>
      (await client.get<{ foo: Record<string, string> }>({ index: kibanaIndex, id: fooDocId }))
        ._source;

    await initialize();
    const initialized = await getIndex();
    expect(initialized.mappings?.properties?.foo).toEqual(
      expect.objectContaining({
        properties: expect.objectContaining({ newField: { type: 'keyword' } }),
      })
    );
    expect(Object.keys(initialized.aliases ?? {}).sort()).toEqual([
      kibanaIndex,
      `${kibanaIndex}_9.5.0`,
    ]);
    expect(initialized.mappings?._meta?.mappingVersions?.foo).toEqual('10.2.0');
    expect(await getFooDoc()).toEqual(
      expect.objectContaining({ foo: { someField: 'some value' } })
    );

    await migrate();
    const migrated = await getIndex();
    expect(migrated.mappings?._meta?.mappingVersions?.foo).toEqual('10.3.0');
    expect(migrated.mappings?._meta?.docVersions?.foo).toEqual('10.3.0');
    expect(await getFooDoc()).toEqual(
      expect.objectContaining({ foo: { someField: 'some value', newField: 'backfilled' } })
    );
  });
});
