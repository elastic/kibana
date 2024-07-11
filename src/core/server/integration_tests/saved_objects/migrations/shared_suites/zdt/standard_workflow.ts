/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import fs from 'fs/promises';
import { range } from 'lodash';
import { SavedObjectsBulkCreateObject } from '@kbn/core-saved-objects-api-server';
import '../../jest_matchers';
import { getKibanaMigratorTestKit } from '../../kibana_migrator_test_kit';
import { parseLogFile } from '../../test_utils';
import { EsRunner, EsServer } from '../../test_types';
import {
  getBaseMigratorParams,
  getSampleAType,
  getSampleBType,
  dummyModelVersion,
} from '../../fixtures/zdt_base.fixtures';

export function createStandardWorkflowTest({
  startES,
  logFilePath,
}: {
  startES: EsRunner;
  logFilePath: string;
}) {
  let esServer: EsServer;

  beforeAll(async () => {
    await fs.unlink(logFilePath).catch(() => {});
    esServer = await startES();
  });

  afterAll(async () => {
    await esServer?.stop();
  });

  const createBaseline = async () => {
    const { runMigrations, savedObjectsRepository } = await getKibanaMigratorTestKit({
      ...getBaseMigratorParams(),
      types: [getSampleAType(), getSampleBType()],
    });
    await runMigrations();

    const sampleAObjs = range(5).map<SavedObjectsBulkCreateObject>((number) => ({
      id: `a-${number}`,
      type: 'sample_a',
      attributes: { keyword: `a_${number}`, boolean: true },
    }));

    await savedObjectsRepository.bulkCreate(sampleAObjs);

    const sampleBObjs = range(5).map<SavedObjectsBulkCreateObject>((number) => ({
      id: `b-${number}`,
      type: 'sample_b',
      attributes: { text: `i am number ${number}`, text2: `some static text` },
    }));

    await savedObjectsRepository.bulkCreate(sampleBObjs);
  };

  it('follows the expected stages and transitions', async () => {
    await createBaseline();

    const typeA = getSampleAType();
    const typeB = getSampleBType();

    typeA.modelVersions = {
      ...typeA.modelVersions,
      '2': dummyModelVersion,
    };

    typeB.modelVersions = {
      ...typeB.modelVersions,
      '2': dummyModelVersion,
    };

    const { runMigrations } = await getKibanaMigratorTestKit({
      ...getBaseMigratorParams(),
      logFilePath,
      types: [typeA, typeB],
    });

    await runMigrations();

    const records = await parseLogFile(logFilePath);

    expect(records).toContainLogEntries(
      [
        'INIT -> UPDATE_INDEX_MAPPINGS',
        'UPDATE_INDEX_MAPPINGS -> UPDATE_INDEX_MAPPINGS_WAIT_FOR_TASK',
        'UPDATE_INDEX_MAPPINGS_WAIT_FOR_TASK -> UPDATE_MAPPING_MODEL_VERSIONS',
        'UPDATE_MAPPING_MODEL_VERSIONS -> INDEX_STATE_UPDATE_DONE',
        'INDEX_STATE_UPDATE_DONE -> DOCUMENTS_UPDATE_INIT',
        'DOCUMENTS_UPDATE_INIT -> SET_DOC_MIGRATION_STARTED',
        'SET_DOC_MIGRATION_STARTED -> SET_DOC_MIGRATION_STARTED_WAIT_FOR_INSTANCES',
        'SET_DOC_MIGRATION_STARTED_WAIT_FOR_INSTANCES -> CLEANUP_UNKNOWN_AND_EXCLUDED_DOCS',
        'CLEANUP_UNKNOWN_AND_EXCLUDED_DOCS -> CLEANUP_UNKNOWN_AND_EXCLUDED_DOCS_WAIT_FOR_TASK',
        'CLEANUP_UNKNOWN_AND_EXCLUDED_DOCS_WAIT_FOR_TASK -> OUTDATED_DOCUMENTS_SEARCH_OPEN_PIT',
        'OUTDATED_DOCUMENTS_SEARCH_OPEN_PIT -> OUTDATED_DOCUMENTS_SEARCH_READ',
        'OUTDATED_DOCUMENTS_SEARCH_READ -> OUTDATED_DOCUMENTS_SEARCH_TRANSFORM',
        'OUTDATED_DOCUMENTS_SEARCH_TRANSFORM -> OUTDATED_DOCUMENTS_SEARCH_BULK_INDEX',
        'OUTDATED_DOCUMENTS_SEARCH_BULK_INDEX -> OUTDATED_DOCUMENTS_SEARCH_READ',
        'OUTDATED_DOCUMENTS_SEARCH_READ -> OUTDATED_DOCUMENTS_SEARCH_CLOSE_PIT',
        'OUTDATED_DOCUMENTS_SEARCH_CLOSE_PIT -> OUTDATED_DOCUMENTS_SEARCH_REFRESH',
        'OUTDATED_DOCUMENTS_SEARCH_REFRESH -> UPDATE_DOCUMENT_MODEL_VERSIONS',
        'UPDATE_DOCUMENT_MODEL_VERSIONS -> UPDATE_DOCUMENT_MODEL_VERSIONS_WAIT_FOR_INSTANCES',
        'UPDATE_DOCUMENT_MODEL_VERSIONS_WAIT_FOR_INSTANCES -> DONE',
        'Migration completed',
      ],
      { ordered: true }
    );
  });
}
