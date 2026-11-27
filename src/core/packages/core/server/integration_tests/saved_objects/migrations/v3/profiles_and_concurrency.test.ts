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
import { type TestElasticsearchUtils } from '@kbn/core-test-helpers-kbn-server';
import {
  deleteSavedObjectIndices,
  getKibanaMigratorTestKit,
  startElasticsearch,
  type KibanaMigratorTestKitParams,
} from '@kbn/migrator-test-kit';
import { getBaseMigratorParams } from '../fixtures/zdt_base.fixtures';
import { createType, parseLogFile } from '../test_utils';

interface Titled {
  title: string;
}

const appendVersion =
  (version: number): SavedObjectModelDataBackfillFn<Titled, Titled> =>
  ({ attributes }) => ({ attributes: { title: `${attributes.title}-${version}` } });

const logFilePath = Path.join(__dirname, 'profiles_and_concurrency.test.log');

/** A type whose n-th model version adds the `field<n>` mapping and appends `-n` to its `title`. */
const getTitledType = (modelVersions: number): SavedObjectsType => {
  const versions = range(2, modelVersions + 1);
  return createType({
    name: 'titled',
    mappings: {
      properties: {
        title: { type: 'keyword' },
        ...Object.fromEntries(versions.map((version) => [`field${version}`, { type: 'keyword' }])),
      },
    },
    modelVersions: versions.reduce<SavedObjectsModelVersionMap>(
      (map, version) => ({
        ...map,
        [version]: {
          changes: [
            {
              type: 'mappings_addition',
              addedMappings: { [`field${version}`]: { type: 'keyword' } },
            },
            {
              type: 'data_backfill',
              backfillFn: appendVersion(version),
            },
          ],
        },
      }),
      { 1: { changes: [] } }
    ),
  });
};

interface MigratorParams {
  kibanaVersion: string;
  modelVersions: number;
  serverless?: boolean;
  /** Whether this node converts documents on Serverless (`migrations.zdt.runOnRoles`). */
  migratesDocuments?: boolean;
  logFile?: string;
  batchSize?: number;
  /** Whether this node waits for another instance to migrate (classic background-tasks-only nodes). */
  waitForMigrationCompletion?: boolean;
}

const getMigrator = ({
  kibanaVersion,
  modelVersions,
  serverless = false,
  migratesDocuments = true,
  logFile = logFilePath,
  batchSize,
  waitForMigrationCompletion = false,
}: MigratorParams) => {
  const { settings, ...baseParams } = getBaseMigratorParams({
    migrationAlgorithm: 'v3',
    kibanaVersion,
    runOnNonMigratorNodes: migratesDocuments,
  });
  const params: KibanaMigratorTestKitParams = {
    ...baseParams,
    settings: { ...settings, migrations: { ...settings?.migrations, batchSize } },
    // index creation relies on Serverless index settings: the baseline is always created by the classic profile
    esCapabilities: { serverless },
    nodeRoles: { ui: true, backgroundTasks: true, migrator: false },
    waitForMigrationCompletion,
    logFilePath: logFile,
    types: [getTitledType(modelVersions)],
  };
  return getKibanaMigratorTestKit(params);
};

/** The stored state: the repository can't be used, it migrates documents on read. */
const getState = async ({ client }: Awaited<ReturnType<typeof getMigrator>>) => {
  const { hits } = await client.search<{ titled: { title: string } }>({
    index: '.kibana',
    query: { term: { type: 'titled' } },
    size: 100,
  });
  const [{ aliases = {}, mappings = {} }] = Object.values(
    await client.indices.get({ index: '.kibana' })
  );
  return {
    titles: sortBy(hits.hits, '_id').map(({ _source }) => _source?.titled.title),
    aliases: Object.keys(aliases).sort(),
    meta: mappings._meta,
  };
};

/** Resolves once the log file contains the entry, as logs are written asynchronously. */
const waitForLogEntry = async (logFile: string, entry: string, attempts = 60): Promise<void> => {
  const records = await parseLogFile(logFile).catch(() => []);
  if (records.some(({ message }) => message.includes(entry))) {
    return;
  }
  if (attempts === 0) {
    throw new Error(`"${entry}" not found in ${logFile}`);
  }
  await new Promise((resolve) => setTimeout(resolve, 500));
  return waitForLogEntry(logFile, entry, attempts - 1);
};

describe('v3 migrations', () => {
  let esServer: TestElasticsearchUtils['es'];

  beforeAll(async () => {
    esServer = await startElasticsearch();
  });

  afterAll(async () => {
    await esServer?.stop();
  });

  beforeEach(async () => {
    await fs.unlink(logFilePath).catch(() => {});
    const baseline = await getMigrator({ kibanaVersion: '9.4.0', modelVersions: 2 });
    await baseline.runMigrations();
    await baseline.savedObjectsRepository.bulkCreate(
      range(3).map((index) => ({
        id: `${index}`,
        type: 'titled',
        attributes: { title: `t${index}` },
      })),
      { refresh: 'wait_for' }
    );
    await fs.unlink(logFilePath);
  });

  afterEach(async () => {
    const { client } = await getKibanaMigratorTestKit({ logFilePath, types: [getTitledType(1)] });
    await deleteSavedObjectIndices(client, ['.kibana*']);
  });

  describe('on rollbacks', () => {
    it('leave the index untouched on Serverless', async () => {
      const rollback = await getMigrator({
        kibanaVersion: '9.3.0',
        modelVersions: 1,
        serverless: true,
      });
      const before = await getState(rollback);

      await rollback.runMigrations();

      expect(await getState(rollback)).toEqual(before);
      const records = await parseLogFile(logFilePath);
      expect(records).toContainLogEntries(
        ['INIT -> INDEX_STATE_UPDATE_DONE', 'INDEX_STATE_UPDATE_DONE -> DONE'],
        { ordered: true }
      );
    });

    it('fail on classic deployments', async () => {
      const rollback = await getMigrator({ kibanaVersion: '9.3.0', modelVersions: 1 });
      await expect(rollback.runMigrations()).rejects.toThrow(
        'The .kibana_9.4.0 alias refers to a newer version of Kibana: v9.4.0'
      );
    });
  });

  describe('on upgrades', () => {
    it('remove the previous version aliases on classic deployments', async () => {
      const upgrade = await getMigrator({ kibanaVersion: '9.5.0', modelVersions: 3 });
      await upgrade.runMigrations();

      expect(await getState(upgrade)).toEqual({
        titles: ['t0-3', 't1-3', 't2-3'],
        aliases: ['.kibana', '.kibana_9.5.0'],
        meta: { mappingVersions: { titled: '10.3.0' }, docVersions: { titled: '10.3.0' } },
      });
    });

    it('keep the previous version aliases, and skip the cluster checks, on Serverless', async () => {
      const upgrade = await getMigrator({
        kibanaVersion: '9.5.0',
        modelVersions: 3,
        serverless: true,
      });
      await upgrade.runMigrations();

      expect(await getState(upgrade)).toMatchObject({
        titles: ['t0-3', 't1-3', 't2-3'],
        aliases: ['.kibana', '.kibana_9.4.0', '.kibana_9.5.0'],
      });
      const records = await parseLogFile(logFilePath);
      expect(records).toContainLogEntry('INIT -> WAIT_FOR_YELLOW_SOURCE');
      expect(records).not.toContainLogEntry('CHECK_CLUSTER_ROUTING_ALLOCATION');
    });

    it('update the mappings but leave the documents to the migrator nodes on Serverless', async () => {
      const uiNode = await getMigrator({
        kibanaVersion: '9.5.0',
        modelVersions: 3,
        serverless: true,
        migratesDocuments: false,
      });
      await uiNode.runMigrations();

      expect(await getState(uiNode)).toMatchObject({
        titles: ['t0', 't1', 't2'],
        meta: { mappingVersions: { titled: '10.3.0' }, docVersions: { titled: '10.2.0' } },
      });

      const migratorNode = await getMigrator({
        kibanaVersion: '9.5.0',
        modelVersions: 3,
        serverless: true,
      });
      await migratorNode.runMigrations();
      expect(await getState(migratorNode)).toMatchObject({
        titles: ['t0-3', 't1-3', 't2-3'],
        meta: { mappingVersions: { titled: '10.3.0' }, docVersions: { titled: '10.3.0' } },
      });
    });

    it('make the waiting nodes wait, without writing, until another instance completes the migration', async () => {
      const waiterLogFile = logFilePath.replace('.log', '_waiter.log');
      await fs.unlink(waiterLogFile).catch(() => {});
      const waiter = await getMigrator({
        kibanaVersion: '9.5.0',
        modelVersions: 3,
        waitForMigrationCompletion: true,
        logFile: waiterLogFile,
      });
      const before = await getState(waiter);

      let waited = false;
      const waiting = waiter.runMigrations().finally(() => {
        waited = true;
      });
      await waitForLogEntry(waiterLogFile, 'INIT -> WAIT_FOR_MIGRATION_COMPLETION');
      expect(waited).toBe(false);
      expect(await getState(waiter)).toEqual(before);

      const migrator = await getMigrator({ kibanaVersion: '9.5.0', modelVersions: 3 });
      await migrator.runMigrations();

      await expect(waiting).resolves.toEqual([expect.objectContaining({ status: 'patched' })]);
      expect(await parseLogFile(waiterLogFile)).toContainLogEntry(
        'Another Kibana instance completed the migration.'
      );
      expect(await getState(waiter)).toEqual({
        titles: ['t0-3', 't1-3', 't2-3'],
        aliases: ['.kibana', '.kibana_9.5.0'],
        meta: { mappingVersions: { titled: '10.3.0' }, docVersions: { titled: '10.3.0' } },
      });
    });

    it('complete when several migrators convert the documents concurrently', async () => {
      const logFiles = range(3).map((index) => logFilePath.replace('.log', `_${index}.log`));
      await Promise.all(logFiles.map((logFile) => fs.unlink(logFile).catch(() => {})));
      // one document per batch: every migrator reads outdated documents before the first one completes
      const migrators = await Promise.all(
        logFiles.map((logFile) =>
          getMigrator({ kibanaVersion: '9.5.0', modelVersions: 3, logFile, batchSize: 1 })
        )
      );

      const results = await Promise.all(migrators.map(({ runMigrations }) => runMigrations()));

      // the migrations overlapped: each migrator found outdated documents to convert
      const logs = await Promise.all(logFiles.map((logFile) => parseLogFile(logFile)));
      logs.forEach((records) => expect(records).toContainLogEntry('Starting to process'));

      results.forEach((result) =>
        expect(result).toEqual([
          expect.objectContaining({ status: 'patched', destIndex: '.kibana' }),
        ])
      );
      expect(await getState(migrators[0])).toEqual({
        titles: ['t0-3', 't1-3', 't2-3'],
        aliases: ['.kibana', '.kibana_9.5.0'],
        meta: { mappingVersions: { titled: '10.3.0' }, docVersions: { titled: '10.3.0' } },
      });
    });
  });

  it('creates the index once when several migrators run concurrently on a fresh cluster', async () => {
    const { client } = await getKibanaMigratorTestKit({ logFilePath, types: [getTitledType(1)] });
    await deleteSavedObjectIndices(client, ['.kibana*']);
    const migrators = await Promise.all(
      range(3).map(() => getMigrator({ kibanaVersion: '9.5.0', modelVersions: 3 }))
    );

    await Promise.all(migrators.map(({ runMigrations }) => runMigrations()));

    expect(Object.keys(await client.indices.get({ index: '.kibana*' }))).toEqual(['.kibana_1']);
  });
});
