/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { join } from 'path';
import { omit, sortBy } from 'lodash';
import type { TestElasticsearchUtils } from '@kbn/core-test-helpers-kbn-server';
import type { MigrationResult } from '@kbn/core-saved-objects-base-server-internal';
import type { Client } from '@elastic/elasticsearch';
import {
  clearLog,
  defaultKibanaIndex,
  defaultKibanaTaskIndex,
  getAggregatedTypesCount,
  getEsClient,
  nextMinor,
  startElasticsearch,
} from '../kibana_migrator_test_kit';
import {
  BASELINE_COMPLEX_DOCUMENTS_500K_AFTER,
  BASELINE_DOCUMENTS_PER_TYPE_500K,
  BASELINE_TEST_ARCHIVE_500K,
} from '../kibana_migrator_archive_utils';
import {
  getRelocatingMigratorTestKit,
  kibanaSplitIndex,
} from '../kibana_migrator_test_kit.fixtures';
import { delay, parseLogFile } from '../test_utils';
import '../jest_matchers';
import { expectDocumentsMigratedToHighestVersion } from '../kibana_migrator_test_kit.expect';

const PARALLEL_MIGRATORS = 3;
type Job<T> = () => Promise<T>;

const getLogFile = (node: number) => join(__dirname, `multiple_kb_nodes_${node}.log`);
const logFileSecondRun = join(__dirname, `multiple_kb_nodes_second_run.log`);

describe('multiple Kibana nodes performing a reindexing migration', () => {
  jest.setTimeout(1200000); // costly test
  let esServer: TestElasticsearchUtils['es'];
  let client: Client;
  let results: MigrationResult[][];

  beforeEach(async () => {
    for (let i = 0; i < PARALLEL_MIGRATORS; ++i) {
      await clearLog(getLogFile(i));
    }
    await clearLog(logFileSecondRun);

    esServer = await startElasticsearch({ dataArchive: BASELINE_TEST_ARCHIVE_500K });
    client = await getEsClient();
    await checkBeforeState();
  });

  it.each([
    {
      case: 'migrate saved objects normally when started at the same time',
      delaySeconds: 0,
    },
    {
      case: 'migrate saved objects normally when started with a small interval',
      delaySeconds: 1,
    },
    {
      case: 'migrate saved objects normally when started with an average interval',
      delaySeconds: 5,
    },
    {
      case: 'migrate saved objects normally when started with a bigger interval',
      delaySeconds: 20,
    },
  ])('$case', async ({ delaySeconds }) => {
    const jobs = await createMigratorJobs(PARALLEL_MIGRATORS);
    results = await startWithDelay(jobs, delaySeconds);
    checkMigratorsResults();
    await checkIndicesInfo();
    await checkSavedObjectDocuments();
    await checkFirstNodeSteps();
    await checkUpToDateOnRestart();
  });

  afterEach(async () => {
    await esServer?.stop();
    await delay(5); // give it a few seconds... cause we always do ¯\_(ツ)_/¯
  });

  async function checkBeforeState() {
    await expect(getAggregatedTypesCount(client, [defaultKibanaIndex])).resolves.toEqual({
      basic: BASELINE_DOCUMENTS_PER_TYPE_500K,
      complex: BASELINE_DOCUMENTS_PER_TYPE_500K,
      deprecated: BASELINE_DOCUMENTS_PER_TYPE_500K,
      server: BASELINE_DOCUMENTS_PER_TYPE_500K,
    });
    await expect(getAggregatedTypesCount(client, [defaultKibanaTaskIndex])).resolves.toEqual({
      task: BASELINE_DOCUMENTS_PER_TYPE_500K,
    });
    await expect(getAggregatedTypesCount(client, [kibanaSplitIndex])).resolves.toEqual({});
  }

  function checkMigratorsResults() {
    const flatResults = results.flat(); // multiple nodes, multiple migrators each

    // each migrator should take less than 120 seconds
    const painfulMigrator = (flatResults as Array<{ elapsedMs?: number }>).find(
      ({ elapsedMs }) => elapsedMs && elapsedMs > 120_000
    );
    expect(painfulMigrator).toBeUndefined();

    // each migrator has either migrated or patched
    const failedMigrator = flatResults.find(
      ({ status }) => status !== 'migrated' && status !== 'patched'
    );
    expect(failedMigrator).toBeUndefined();
  }

  async function checkIndicesInfo() {
    const indicesInfo = await client.indices.get({ index: '.kibana*' });
    [defaultKibanaIndex, kibanaSplitIndex].forEach((index) =>
      expect(indicesInfo[`${index}_${nextMinor}_001`]).toEqual(
        expect.objectContaining({
          aliases: expect.objectContaining({ [index]: expect.any(Object) }),
          mappings: {
            dynamic: 'strict',
            _meta: {
              mappingVersions: expect.any(Object),
              indexTypesMap: expect.any(Object),
            },
            properties: expect.any(Object),
          },
          settings: { index: expect.any(Object) },
        })
      )
    );

    const typesMap =
      indicesInfo[`${defaultKibanaIndex}_${nextMinor}_001`].mappings?._meta?.indexTypesMap;
    expect(typesMap[defaultKibanaIndex]).toEqual(['complex', 'recent', 'server']); // 'deprecated' no longer present
    expect(typesMap[kibanaSplitIndex]).toEqual(['basic', 'task']);
  }

  async function checkSavedObjectDocuments() {
    // check documents have been migrated
    await expect(getAggregatedTypesCount(client, [defaultKibanaIndex])).resolves.toEqual({
      complex: BASELINE_COMPLEX_DOCUMENTS_500K_AFTER,
    });
    await expect(getAggregatedTypesCount(client, [defaultKibanaTaskIndex])).resolves.toEqual({});
    await expect(getAggregatedTypesCount(client, [kibanaSplitIndex])).resolves.toEqual({
      basic: BASELINE_DOCUMENTS_PER_TYPE_500K,
      task: BASELINE_DOCUMENTS_PER_TYPE_500K,
    });
    await expectDocumentsMigratedToHighestVersion(client, [defaultKibanaIndex, kibanaSplitIndex]);
  }

  async function checkFirstNodeSteps() {
    const logs = await parseLogFile(getLogFile(0));
    // '.kibana_migrator_split' is a new index, all nodes' migrators must attempt to create it
    expect(logs).toContainLogEntries(
      [
        `[${kibanaSplitIndex}] INIT -> CREATE_REINDEX_TEMP.`,
        `[${kibanaSplitIndex}] CREATE_REINDEX_TEMP -> READY_TO_REINDEX_SYNC.`,
        // no docs to reindex, as source index did NOT exist
        `[${kibanaSplitIndex}] READY_TO_REINDEX_SYNC -> DONE_REINDEXING_SYNC.`,
      ],
      { ordered: true }
    );

    // '.kibana_migrator' and '.kibana_migrator_tasks' are involved in a relocation
    [defaultKibanaIndex, defaultKibanaTaskIndex].forEach((index) => {
      expect(logs).toContainLogEntries(
        [
          `[${index}] INIT -> WAIT_FOR_YELLOW_SOURCE.`,
          `[${index}] WAIT_FOR_YELLOW_SOURCE -> CHECK_CLUSTER_ROUTING_ALLOCATION.`,
          `[${index}] CHECK_CLUSTER_ROUTING_ALLOCATION -> CHECK_UNKNOWN_DOCUMENTS.`,
          `[${index}] CHECK_UNKNOWN_DOCUMENTS -> SET_SOURCE_WRITE_BLOCK.`,
          `[${index}] SET_SOURCE_WRITE_BLOCK -> CALCULATE_EXCLUDE_FILTERS.`,
          `[${index}] CALCULATE_EXCLUDE_FILTERS -> CREATE_REINDEX_TEMP.`,
          `[${index}] CREATE_REINDEX_TEMP -> READY_TO_REINDEX_SYNC.`,
          `[${index}] READY_TO_REINDEX_SYNC -> REINDEX_SOURCE_TO_TEMP_OPEN_PIT.`,
          `[${index}] REINDEX_SOURCE_TO_TEMP_OPEN_PIT -> REINDEX_SOURCE_TO_TEMP_READ.`,
          `[${index}] REINDEX_SOURCE_TO_TEMP_READ -> REINDEX_SOURCE_TO_TEMP_TRANSFORM.`,
          `[${index}] REINDEX_SOURCE_TO_TEMP_TRANSFORM -> REINDEX_SOURCE_TO_TEMP_INDEX_BULK.`,
          `[${index}] REINDEX_SOURCE_TO_TEMP_INDEX_BULK`,
          // if the index is closed by another node, we will have instead: REINDEX_SOURCE_TO_TEMP_TRANSFORM => REINDEX_SOURCE_TO_TEMP_CLOSE_PIT.
          // `[${index}] REINDEX_SOURCE_TO_TEMP_READ -> REINDEX_SOURCE_TO_TEMP_CLOSE_PIT.`,
          `[${index}] REINDEX_SOURCE_TO_TEMP_CLOSE_PIT -> DONE_REINDEXING_SYNC.`,
        ],
        { ordered: true }
      );
    });

    // after the relocation, all migrators share the final part of the flow
    [defaultKibanaIndex, defaultKibanaTaskIndex, kibanaSplitIndex].forEach((index) => {
      expect(logs).toContainLogEntries(
        [
          `[${index}] DONE_REINDEXING_SYNC -> SET_TEMP_WRITE_BLOCK.`,
          `[${index}] SET_TEMP_WRITE_BLOCK -> CLONE_TEMP_TO_TARGET.`,
          `[${index}] CLONE_TEMP_TO_TARGET -> REFRESH_TARGET.`,
          `[${index}] REFRESH_TARGET -> OUTDATED_DOCUMENTS_SEARCH_OPEN_PIT.`,
          `[${index}] OUTDATED_DOCUMENTS_SEARCH_OPEN_PIT -> OUTDATED_DOCUMENTS_SEARCH_READ.`,
          `[${index}] OUTDATED_DOCUMENTS_SEARCH_READ -> OUTDATED_DOCUMENTS_SEARCH_CLOSE_PIT.`,
          `[${index}] OUTDATED_DOCUMENTS_SEARCH_CLOSE_PIT -> CHECK_TARGET_MAPPINGS.`,
          `[${index}] CHECK_TARGET_MAPPINGS -> UPDATE_TARGET_MAPPINGS_PROPERTIES.`,
          `[${index}] UPDATE_TARGET_MAPPINGS_PROPERTIES -> UPDATE_TARGET_MAPPINGS_PROPERTIES_WAIT_FOR_TASK.`,
          `[${index}] UPDATE_TARGET_MAPPINGS_PROPERTIES_WAIT_FOR_TASK -> UPDATE_TARGET_MAPPINGS_META.`,
          `[${index}] UPDATE_TARGET_MAPPINGS_META -> CHECK_VERSION_INDEX_READY_ACTIONS.`,
          `[${index}] CHECK_VERSION_INDEX_READY_ACTIONS -> MARK_VERSION_INDEX_READY_SYNC.`,
          `[${index}] MARK_VERSION_INDEX_READY_SYNC`, // all migrators try to update all aliases, all but one will have conclicts
          `[${index}] Migration completed after`,
        ],
        { ordered: true }
      );
    });

    // should NOT retransform anything (we reindexed, thus we transformed already)
    [defaultKibanaIndex, defaultKibanaTaskIndex, kibanaSplitIndex].forEach((index) => {
      expect(logs).not.toContainLogEntry(`[${index}] OUTDATED_DOCUMENTS_TRANSFORM`);
      expect(logs).not.toContainLogEntry(
        `[${index}] Kibana is performing a compatible update and it will update the following SO types so that ES can pickup the updated mappings`
      );
    });
  }

  async function checkUpToDateOnRestart() {
    // run a new migrator to ensure everything is up to date
    const { runMigrations } = await getRelocatingMigratorTestKit({
      logFilePath: logFileSecondRun,
      // no need to filter deprecated this time, they should not be there anymore
    });
    const secondRunResults = await runMigrations();
    expect(
      sortBy(
        secondRunResults.map((result) => omit(result, 'elapsedMs')),
        'destIndex'
      )
    ).toEqual([
      {
        destIndex: `${defaultKibanaIndex}_${nextMinor}_001`,
        status: 'patched',
      },
      {
        destIndex: `${kibanaSplitIndex}_${nextMinor}_001`,
        status: 'patched',
      },
    ]);
    const logs = await parseLogFile(logFileSecondRun);
    expect(logs).not.toContainLogEntries(['REINDEX', 'CREATE', 'UPDATE_TARGET_MAPPINGS']);
  }
});

async function createMigratorJobs(nodes: number): Promise<Array<Job<MigrationResult[]>>> {
  const jobs: Array<Job<MigrationResult[]>> = [];

  for (let i = 0; i < nodes; ++i) {
    const kit = await getRelocatingMigratorTestKit({
      logFilePath: getLogFile(i),
      filterDeprecated: true,
    });
    jobs.push(kit.runMigrations);
  }

  return jobs;
}

async function startWithDelay<T>(runnables: Array<Job<T>>, delayInSec: number) {
  const promises: Array<Promise<T>> = [];
  const errors: string[] = [];
  for (let i = 0; i < runnables.length; i++) {
    promises.push(
      runnables[i]().catch((reason) => {
        errors.push(reason.message ?? reason);
        return reason;
      })
    );
    if (i < runnables.length - 2) {
      // We wait between instances, but not after the last one
      await delay(delayInSec);
    }
  }
  const results = await Promise.all(promises);
  if (errors.length) {
    throw new Error(`Failed to run all parallel jobs: ${errors.join(',')}`);
  } else {
    return results;
  }
}
