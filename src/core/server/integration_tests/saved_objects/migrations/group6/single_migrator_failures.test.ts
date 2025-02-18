/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { join } from 'path';
import type { TestElasticsearchUtils } from '@kbn/core-test-helpers-kbn-server';
import {
  clearLog,
  nextMinor,
  startElasticsearch,
  defaultKibanaIndex,
  defaultKibanaTaskIndex,
} from '../kibana_migrator_test_kit';
import { delay } from '../test_utils';
import '../jest_matchers';
import { getElasticsearchClientWrapperFactory } from '../elasticsearch_client_wrapper';
import { BASELINE_TEST_ARCHIVE_1K } from '../kibana_migrator_archive_utils';
import {
  getRelocatingMigratorTestKit,
  kibanaSplitIndex,
} from '../kibana_migrator_test_kit.fixtures';

export const logFilePathFirstRun = join(__dirname, 'single_migrator_failures_1st_run.test.log');
export const logFilePathSecondRun = join(__dirname, 'single_migrator_failures_2nd_run.test.log');

describe('split .kibana index into multiple system indices', () => {
  let esServer: TestElasticsearchUtils['es'];

  beforeEach(async () => {
    await clearLog(logFilePathFirstRun);
    await clearLog(logFilePathSecondRun);
  });

  describe('failure cases', () => {
    const getFailingKibanaMigratorTestKit = async ({
      logFilePath,
      failOn,
      delaySeconds,
    }: {
      logFilePath: string;
      failOn: (methodName: string, methodArgs: any[]) => boolean;
      delaySeconds?: number;
    }) => {
      const clientWrapperFactory = getElasticsearchClientWrapperFactory({
        failOn,
        errorDelaySeconds: delaySeconds,
      });

      return await getRelocatingMigratorTestKit({ logFilePath, clientWrapperFactory });
    };

    beforeEach(async () => {
      esServer = await startElasticsearch({
        dataArchive: BASELINE_TEST_ARCHIVE_1K,
      });
    });

    describe(`when the ${defaultKibanaTaskIndex} migrator fails on the TRANSFORMED_DOCUMENTS_BULK_INDEX state, after the other ones have finished`, () => {
      it(`is capable of completing the ${defaultKibanaTaskIndex} migration in subsequent restart`, async () => {
        const { runMigrations: firstRun } = await getFailingKibanaMigratorTestKit({
          logFilePath: logFilePathFirstRun,
          failOn: (methodName, methodArgs) => {
            // fail on esClient.bulk({ index: '.kibana_migrator_tasks' }) which supposedly causes
            // the .kibana_migrator_tasks migrator to fail on the TRANSFORMED_DOCUMENTS_BULK_INDEX state
            return methodName === 'bulk' && methodArgs[0].index.startsWith(defaultKibanaTaskIndex);
          },
          delaySeconds: 90, // give the other migrators enough time to finish before failing
        });

        try {
          await firstRun();
          throw new Error('First run should have thrown an error but it did not');
        } catch (error) {
          expect(error.message).toEqual(
            `Unable to complete saved object migrations for the [${defaultKibanaTaskIndex}] index. Error: esClient.bulk() failed unexpectedly`
          );
        }
      });
    });

    describe(`when the ${defaultKibanaIndex} migrator fails on the REINDEX_SOURCE_TO_TEMP_INDEX_BULK state`, () => {
      it('is capable of successfully performing the split migration in subsequent restart', async () => {
        const { runMigrations: firstRun } = await getFailingKibanaMigratorTestKit({
          logFilePath: logFilePathFirstRun,
          failOn: (methodName, methodArgs) => {
            // fail on esClient.bulk({ index: '.kibana_migrator_8.11.0_reindex_temp_alias' }) which supposedly causes
            // the .kibana migrator to fail on the REINDEX_SOURCE_TO_TEMP_INDEX_BULK
            return (
              methodName === 'bulk' &&
              methodArgs[0].index === `${defaultKibanaIndex}_${nextMinor}_reindex_temp_alias`
            );
          },
          delaySeconds: 10, // give the .kibana_migrator_tasks migrator enough time to finish before failing
        });

        try {
          await firstRun();
          throw new Error('First run should have thrown an error but it did not');
        } catch (error) {
          expect(error.message).toEqual(
            `Unable to complete saved object migrations for the [${defaultKibanaIndex}] index. Error: esClient.bulk() failed unexpectedly`
          );
        }
      });
    });

    describe(`when the ${defaultKibanaIndex} migrator fails on the CLONE_TEMP_TO_TARGET state`, () => {
      it('is capable of successfully performing the split migration in subsequent restart', async () => {
        const { runMigrations: firstRun } = await getFailingKibanaMigratorTestKit({
          logFilePath: logFilePathFirstRun,
          failOn: (methodName, methodArgs) => {
            // fail on esClient.indices.clone({ index: '.kibana_migrator_8.11.0_reindex_temp', target: ... }) which supposedly causes
            // the .kibana_migrator migrator to fail on the CLONE_TEMP_TO_TARGET
            return (
              methodName === 'indices.clone' &&
              methodArgs[0].index === `${defaultKibanaIndex}_${nextMinor}_reindex_temp` &&
              methodArgs[0].target === `${defaultKibanaIndex}_${nextMinor}_001`
            );
          },
          delaySeconds: 15, // give the other migrators enough time to finish before failing
        });

        try {
          await firstRun();
          throw new Error('First run should have thrown an error but it did not');
        } catch (error) {
          expect(error.message).toEqual(
            `Unable to complete saved object migrations for the [${defaultKibanaIndex}] index. Error: esClient.indices.clone() failed unexpectedly`
          );
        }
      });
    });

    describe(`when the ${defaultKibanaIndex} migrator fails on the UPDATE_TARGET_MAPPINGS_PROPERTIES state`, () => {
      it('is capable of successfully performing the split migration in subsequent restart', async () => {
        const { runMigrations: firstRun } = await getFailingKibanaMigratorTestKit({
          logFilePath: logFilePathFirstRun,
          failOn: (methodName, methodArgs) => {
            // fail on esClient.updateByQuery({ index: '.kibana_migrator_8.11.0_001' }) which supposedly causes
            // the .kibana_migrator migrator to fail on the UPDATE_TARGET_MAPPINGS_PROPERTIES (pickup mappings' changes)
            return (
              methodName === 'updateByQuery' &&
              methodArgs[0].index === `${defaultKibanaIndex}_${nextMinor}_001`
            );
          },
          delaySeconds: 10, // give the other migrators enough time to finish before failing
        });

        try {
          await firstRun();
          throw new Error('First run should have thrown an error but it did not');
        } catch (error) {
          expect(error.message).toEqual(
            `Unable to complete saved object migrations for the [${defaultKibanaIndex}] index. Error: esClient.updateByQuery() failed unexpectedly`
          );
        }
      });
    });

    describe(`when the ${kibanaSplitIndex} migrator fails on the CLONE_TEMP_TO_TARGET state`, () => {
      it('is capable of successfully performing the split migration in subsequent restart', async () => {
        const { runMigrations: firstRun } = await getFailingKibanaMigratorTestKit({
          logFilePath: logFilePathFirstRun,
          failOn: (methodName, methodArgs) => {
            // fail on esClient.indices.clone({ index: '.kibana_8.11.0_reindex_temp', target: ... }) which supposedly causes
            // the .kibana migrator to fail on the CLONE_TEMP_TO_TARGET
            return (
              methodName === 'indices.clone' &&
              methodArgs[0].index === `${kibanaSplitIndex}_${nextMinor}_reindex_temp` &&
              methodArgs[0].target === `${kibanaSplitIndex}_${nextMinor}_001`
            );
          },
          delaySeconds: 15, // give the other migrators enough time to finish before failing
        });

        try {
          await firstRun();
          throw new Error('First run should have thrown an error but it did not');
        } catch (error) {
          expect(error.message).toEqual(
            `Unable to complete saved object migrations for the [${kibanaSplitIndex}] index. Error: esClient.indices.clone() failed unexpectedly`
          );
        }
      });
    });

    describe(`when the ${kibanaSplitIndex} migrator fails on the UPDATE_TARGET_MAPPINGS_PROPERTIES state`, () => {
      it('is capable of successfully performing the split migration in subsequent restart', async () => {
        const { runMigrations: firstRun } = await getFailingKibanaMigratorTestKit({
          logFilePath: logFilePathFirstRun,
          failOn: (methodName, methodArgs) => {
            // fail on esClient.updateByQuery({ index: '.kibana_8.11.0_001' }) which supposedly causes
            // the .kibana migrator to fail on the UPDATE_TARGET_MAPPINGS_PROPERTIES (pickup mappings' changes)
            return (
              methodName === 'updateByQuery' &&
              methodArgs[0].index === `${kibanaSplitIndex}_${nextMinor}_001`
            );
          },
          delaySeconds: 10, // give the other migrators enough time to finish before failing
        });

        try {
          await firstRun();
          throw new Error('First run should have thrown an error but it did not');
        } catch (error) {
          expect(error.message).toEqual(
            `Unable to complete saved object migrations for the [${kibanaSplitIndex}] index. Error: esClient.updateByQuery() failed unexpectedly`
          );
        }
      });
    });

    afterEach(async () => {
      const { runMigrations: secondRun } = await getRelocatingMigratorTestKit({
        logFilePath: logFilePathSecondRun,
      });

      const results = await secondRun();
      expect(
        results
          .flat()
          .every((result) => result.status === 'migrated' || result.status === 'patched')
      ).toEqual(true);

      await esServer?.stop();
      await delay(2);
    });
  });
});
