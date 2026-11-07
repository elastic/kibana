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
import { range, sortBy } from 'lodash';
import '../jest_matchers';
import type {
  SavedObjectModelDataBackfillFn,
  SavedObjectsModelVersionMap,
  SavedObjectsType,
} from '@kbn/core-saved-objects-server';
import type { MigrationAlgorithm } from '@kbn/core-saved-objects-base-server-internal';
import { type TestElasticsearchUtils } from '@kbn/core-test-helpers-kbn-server';
import {
  deleteSavedObjectIndices,
  getKibanaMigratorTestKit,
  startElasticsearch,
} from '@kbn/migrator-test-kit';
import { getBaseMigratorParams } from '../fixtures/zdt_base.fixtures';
import { createType } from '../test_utils';

interface Titled {
  title: string;
}

const appendVersion =
  (version: number): SavedObjectModelDataBackfillFn<Titled, Titled> =>
  ({ attributes }) => ({ attributes: { title: `${attributes.title}-${version}` } });

const logFilePath = Path.join(__dirname, 'algorithm_switch.test.log');

/** A type whose n-th model version appends `-n` to its `title`. */
const getTitledType = (modelVersions: number): SavedObjectsType =>
  createType({
    name: 'titled',
    mappings: { properties: { title: { type: 'keyword' } } },
    modelVersions: range(1, modelVersions + 1).reduce<SavedObjectsModelVersionMap>(
      (versions, version) => ({
        ...versions,
        [version]: {
          changes:
            version === 1
              ? []
              : [
                  {
                    type: 'data_backfill',
                    backfillFn: appendVersion(version),
                  },
                ],
        },
      }),
      {}
    ),
  });

const migrate = async (
  migrationAlgorithm: MigrationAlgorithm,
  kibanaVersion: string,
  modelVersions: number
) => {
  const kit = await getKibanaMigratorTestKit({
    ...getBaseMigratorParams({ migrationAlgorithm, kibanaVersion }),
    logFilePath,
    types: [getTitledType(modelVersions)],
  });
  await kit.runMigrations();
  return kit;
};

/** The stored titles: the repository can't be used, it migrates documents on read. */
const getTitles = async ({ client }: Awaited<ReturnType<typeof getKibanaMigratorTestKit>>) => {
  const { hits } = await client.search<{ titled: { title: string } }>({
    index: '.kibana',
    query: { term: { type: 'titled' } },
    size: 100,
  });
  return sortBy(hits.hits, '_id').map(({ _source }) => _source?.titled.title);
};

describe('v3 migrations - switching from and to other algorithms', () => {
  let esServer: TestElasticsearchUtils['es'];

  beforeAll(async () => {
    esServer = await startElasticsearch();
  });

  afterAll(async () => {
    await esServer?.stop();
  });

  beforeEach(async () => {
    await fs.unlink(logFilePath).catch(() => {});
  });

  afterEach(async () => {
    const { client } = await getKibanaMigratorTestKit({ logFilePath, types: [getTitledType(1)] });
    await deleteSavedObjectIndices(client, ['.kibana*']);
  });

  const createBaseline = async (migrationAlgorithm: MigrationAlgorithm) => {
    const kit = await migrate(migrationAlgorithm, '9.3.0', 1);
    await kit.savedObjectsRepository.bulkCreate(
      range(3).map((index) => ({
        id: `${index}`,
        type: 'titled',
        attributes: { title: `t${index}` },
      })),
      { refresh: 'wait_for' }
    );
  };

  it('zdt -> v3 -> zdt', async () => {
    await createBaseline('zdt');

    const v3 = await migrate('v3', '9.4.0', 2);
    expect(await getTitles(v3)).toEqual(['t0-2', 't1-2', 't2-2']);

    const indices = await v3.client.indices.get({ index: '.kibana' });
    const [[name, { aliases = {}, mappings = {} }]] = Object.entries(indices);
    expect(name).toBe('.kibana_1');
    // the previous version alias is removed on classic deployments
    expect(Object.keys(aliases).sort()).toEqual(['.kibana', '.kibana_9.4.0']);
    // v3 preserves the fields of _meta it doesn't own
    expect(mappings._meta).toEqual(
      expect.objectContaining({
        mappingVersions: { titled: '10.2.0' },
        docVersions: { titled: '10.2.0' },
        migrationState: expect.any(Object),
      })
    );

    const zdt = await migrate('zdt', '9.5.0', 3);
    expect(await getTitles(zdt)).toEqual(['t0-2-3', 't1-2-3', 't2-2-3']);
  });

  it('v3 -> zdt, on an index created by v3, without any zdt migrationState', async () => {
    await createBaseline('v3');

    const zdt = await migrate('zdt', '9.4.0', 2);
    expect(await getTitles(zdt)).toEqual(['t0-2', 't1-2', 't2-2']);
  });

  it('v3 -> v2', async () => {
    await createBaseline('v3');

    const v2 = await migrate('v2', '9.4.0', 2);
    expect(await getTitles(v2)).toEqual(['t0-2', 't1-2', 't2-2']);
  });

  it('v2 -> v3 -> v2', async () => {
    await createBaseline('v2');

    const v3 = await migrate('v3', '9.4.0', 2);
    expect(await getTitles(v3)).toEqual(['t0-2', 't1-2', 't2-2']);

    const v2 = await migrate('v2', '9.5.0', 3);
    expect(await getTitles(v2)).toEqual(['t0-2-3', 't1-2-3', 't2-2-3']);
  });
});
