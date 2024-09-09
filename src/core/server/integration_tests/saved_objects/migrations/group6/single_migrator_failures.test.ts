/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import type { TestElasticsearchUtils } from '@kbn/core-test-helpers-kbn-server';
import {
  type ISavedObjectTypeRegistry,
  MAIN_SAVED_OBJECT_INDEX,
} from '@kbn/core-saved-objects-server';
import { DEFAULT_INDEX_TYPES_MAP } from '@kbn/core-saved-objects-base-server-internal';
import {
  clearLog,
  startElasticsearch,
  getKibanaMigratorTestKit,
  getCurrentVersionTypeRegistry,
  currentVersion,
} from '../kibana_migrator_test_kit';
import { delay } from '../test_utils';
import '../jest_matchers';
import { getElasticsearchClientWrapperFactory } from '../elasticsearch_client_wrapper';

export const logFilePathFirstRun = Path.join(__dirname, 'dot_kibana_split_1st_run.test.log');
export const logFilePathSecondRun = Path.join(__dirname, 'dot_kibana_split_2nd_run.test.log');

describe('split .kibana index into multiple system indices', () => {
  let esServer: TestElasticsearchUtils['es'];
  let typeRegistry: ISavedObjectTypeRegistry;

  beforeAll(async () => {
    typeRegistry = await getCurrentVersionTypeRegistry({ oss: false });
  });

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

      return await getKibanaMigratorTestKit({
        types: typeRegistry.getAllTypes(),
        kibanaIndex: MAIN_SAVED_OBJECT_INDEX,
        defaultIndexTypesMap: DEFAULT_INDEX_TYPES_MAP,
        logFilePath,
        clientWrapperFactory,
      });
    };

    beforeEach(async () => {
      esServer = await startElasticsearch({
        dataArchive: Path.join(__dirname, '..', 'archives', '7.7.2_xpack_100k_obj.zip'),
      });
    });

    describe('when the .kibana_task_manager migrator fails on the TRANSFORMED_DOCUMENTS_BULK_INDEX state, after the other ones have finished', () => {
      it('is capable of completing the .kibana_task_manager migration in subsequent restart', async () => {
        const { runMigrations: firstRun } = await getFailingKibanaMigratorTestKit({
          logFilePath: logFilePathFirstRun,
          failOn: (methodName, methodArgs) => {
            // fail on esClient.bulk({ index: '.kibana_task_manager_1' }) which supposedly causes
            // the .kibana_task_manager migrator to fail on the TRANSFORMED_DOCUMENTS_BULK_INDEX state
            return methodName === 'bulk' && methodArgs[0].index === '.kibana_task_manager_1';
          },
          delaySeconds: 90, // give the other migrators enough time to finish before failing
        });

        try {
          await firstRun();
          throw new Error('First run should have thrown an error but it did not');
        } catch (error) {
          expect(error.message).toEqual(
            'Unable to complete saved object migrations for the [.kibana_task_manager] index. Error: esClient.bulk() failed unexpectedly'
          );
        }
      });
    });

    describe('when the .kibana migrator fails on the REINDEX_SOURCE_TO_TEMP_INDEX_BULK state', () => {
      it('is capable of successfully performing the split migration in subsequent restart', async () => {
        const { runMigrations: firstRun } = await getFailingKibanaMigratorTestKit({
          logFilePath: logFilePathFirstRun,
          failOn: (methodName, methodArgs) => {
            // fail on esClient.bulk({ index: '.kibana_8.11.0_reindex_temp_alias' }) which supposedly causes
            // the .kibana migrator to fail on the REINDEX_SOURCE_TO_TEMP_INDEX_BULK
            return (
              methodName === 'bulk' &&
              methodArgs[0].index === `.kibana_${currentVersion}_reindex_temp_alias`
            );
          },
          delaySeconds: 10, // give the .kibana_task_manager migrator enough time to finish before failing
        });

        try {
          await firstRun();
          throw new Error('First run should have thrown an error but it did not');
        } catch (error) {
          expect(error.message).toEqual(
            'Unable to complete saved object migrations for the [.kibana] index. Error: esClient.bulk() failed unexpectedly'
          );
        }
      });
    });

    describe('when the .kibana migrator fails on the CLONE_TEMP_TO_TARGET state', () => {
      it('is capable of successfully performing the split migration in subsequent restart', async () => {
        const { runMigrations: firstRun } = await getFailingKibanaMigratorTestKit({
          logFilePath: logFilePathFirstRun,
          failOn: (methodName, methodArgs) => {
            // fail on esClient.indices.clone({ index: '.kibana_8.11.0_reindex_temp', target: ... }) which supposedly causes
            // the .kibana migrator to fail on the CLONE_TEMP_TO_TARGET
            return (
              methodName === 'indices.clone' &&
              methodArgs[0].index === `.kibana_${currentVersion}_reindex_temp` &&
              methodArgs[0].target === `.kibana_${currentVersion}_001`
            );
          },
          delaySeconds: 15, // give the other migrators enough time to finish before failing
        });

        try {
          await firstRun();
          throw new Error('First run should have thrown an error but it did not');
        } catch (error) {
          expect(error.message).toEqual(
            'Unable to complete saved object migrations for the [.kibana] index. Error: esClient.indices.clone() failed unexpectedly'
          );
        }
      });
    });

    describe('when the .kibana migrator fails on the UPDATE_TARGET_MAPPINGS_PROPERTIES state', () => {
      it('is capable of successfully performing the split migration in subsequent restart', async () => {
        const { runMigrations: firstRun } = await getFailingKibanaMigratorTestKit({
          logFilePath: logFilePathFirstRun,
          failOn: (methodName, methodArgs) => {
            // fail on esClient.updateByQuery({ index: '.kibana_8.11.0_001' }) which supposedly causes
            // the .kibana migrator to fail on the UPDATE_TARGET_MAPPINGS_PROPERTIES (pickup mappings' changes)
            return (
              methodName === 'updateByQuery' &&
              methodArgs[0].index === `.kibana_${currentVersion}_001`
            );
          },
          delaySeconds: 10, // give the other migrators enough time to finish before failing
        });

        try {
          await firstRun();
          throw new Error('First run should have thrown an error but it did not');
        } catch (error) {
          expect(error.message).toEqual(
            'Unable to complete saved object migrations for the [.kibana] index. Error: esClient.updateByQuery() failed unexpectedly'
          );
        }
      });
    });

    describe('when the .kibana_analytics migrator fails on the CLONE_TEMP_TO_TARGET state', () => {
      it('is capable of successfully performing the split migration in subsequent restart', async () => {
        const { runMigrations: firstRun } = await getFailingKibanaMigratorTestKit({
          logFilePath: logFilePathFirstRun,
          failOn: (methodName, methodArgs) => {
            // fail on esClient.indices.clone({ index: '.kibana_8.11.0_reindex_temp', target: ... }) which supposedly causes
            // the .kibana migrator to fail on the CLONE_TEMP_TO_TARGET
            return (
              methodName === 'indices.clone' &&
              methodArgs[0].index === `.kibana_analytics_${currentVersion}_reindex_temp` &&
              methodArgs[0].target === `.kibana_analytics_${currentVersion}_001`
            );
          },
          delaySeconds: 15, // give the other migrators enough time to finish before failing
        });

        try {
          await firstRun();
          throw new Error('First run should have thrown an error but it did not');
        } catch (error) {
          expect(error.message).toEqual(
            'Unable to complete saved object migrations for the [.kibana_analytics] index. Error: esClient.indices.clone() failed unexpectedly'
          );
        }
      });
    });

    describe('when the .kibana_analytics migrator fails on the UPDATE_TARGET_MAPPINGS_PROPERTIES state', () => {
      it('is capable of successfully performing the split migration in subsequent restart', async () => {
        const { runMigrations: firstRun } = await getFailingKibanaMigratorTestKit({
          logFilePath: logFilePathFirstRun,
          failOn: (methodName, methodArgs) => {
            // fail on esClient.updateByQuery({ index: '.kibana_8.11.0_001' }) which supposedly causes
            // the .kibana migrator to fail on the UPDATE_TARGET_MAPPINGS_PROPERTIES (pickup mappings' changes)
            return (
              methodName === 'updateByQuery' &&
              methodArgs[0].index === `.kibana_analytics_${currentVersion}_001`
            );
          },
          delaySeconds: 10, // give the other migrators enough time to finish before failing
        });

        try {
          await firstRun();
          throw new Error('First run should have thrown an error but it did not');
        } catch (error) {
          expect(error.message).toEqual(
            'Unable to complete saved object migrations for the [.kibana_analytics] index. Error: esClient.updateByQuery() failed unexpectedly'
          );
        }
      });
    });

    afterEach(async () => {
      const { runMigrations: secondRun } = await getKibanaMigratorTestKit({
        types: typeRegistry.getAllTypes(),
        logFilePath: logFilePathSecondRun,
        kibanaIndex: MAIN_SAVED_OBJECT_INDEX,
        defaultIndexTypesMap: DEFAULT_INDEX_TYPES_MAP,
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
