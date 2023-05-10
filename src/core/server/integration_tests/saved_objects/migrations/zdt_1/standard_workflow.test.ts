/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';
import fs from 'fs/promises';
import { range } from 'lodash';
import { type TestElasticsearchUtils } from '@kbn/core-test-helpers-kbn-server';
import { SavedObjectsBulkCreateObject } from '@kbn/core-saved-objects-api-server';
import '../jest_matchers';
import { getKibanaMigratorTestKit, startElasticsearch } from '../kibana_migrator_test_kit';
import { delay, parseLogFile } from '../test_utils';
import {
  getBaseMigratorParams,
  getSampleAType,
  getSampleBType,
  dummyModelVersion,
} from '../fixtures/zdt_base.fixtures';

export const logFilePath = Path.join(__dirname, 'standard_workflow.test.log');

describe('ZDT upgrades - basic document migration', () => {
  let esServer: TestElasticsearchUtils['es'];

  beforeAll(async () => {
    await fs.unlink(logFilePath).catch(() => {});
    esServer = await startElasticsearch();
  });

  afterAll(async () => {
    await esServer?.stop();
    await delay(10);
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

    expect(records).toContainLogEntry('INIT -> UPDATE_INDEX_MAPPINGS');
    expect(records).toContainLogEntry(
      'UPDATE_INDEX_MAPPINGS -> UPDATE_INDEX_MAPPINGS_WAIT_FOR_TASK'
    );
    expect(records).toContainLogEntry(
      'UPDATE_INDEX_MAPPINGS_WAIT_FOR_TASK -> UPDATE_MAPPING_MODEL_VERSIONS'
    );
    expect(records).toContainLogEntry('UPDATE_MAPPING_MODEL_VERSIONS -> INDEX_STATE_UPDATE_DONE');
    expect(records).toContainLogEntry('INDEX_STATE_UPDATE_DONE -> DOCUMENTS_UPDATE_INIT');
    expect(records).toContainLogEntry('DOCUMENTS_UPDATE_INIT -> SET_DOC_MIGRATION_STARTED');
    expect(records).toContainLogEntry(
      'SET_DOC_MIGRATION_STARTED -> SET_DOC_MIGRATION_STARTED_WAIT_FOR_INSTANCES'
    );
    expect(records).toContainLogEntry(
      'SET_DOC_MIGRATION_STARTED_WAIT_FOR_INSTANCES -> CLEANUP_UNKNOWN_AND_EXCLUDED_DOCS'
    );
    expect(records).toContainLogEntry(
      'CLEANUP_UNKNOWN_AND_EXCLUDED_DOCS -> CLEANUP_UNKNOWN_AND_EXCLUDED_DOCS_WAIT_FOR_TASK'
    );
    expect(records).toContainLogEntry(
      'CLEANUP_UNKNOWN_AND_EXCLUDED_DOCS_WAIT_FOR_TASK -> OUTDATED_DOCUMENTS_SEARCH_OPEN_PIT'
    );
    expect(records).toContainLogEntry(
      'OUTDATED_DOCUMENTS_SEARCH_OPEN_PIT -> OUTDATED_DOCUMENTS_SEARCH_READ'
    );
    expect(records).toContainLogEntry(
      'OUTDATED_DOCUMENTS_SEARCH_READ -> OUTDATED_DOCUMENTS_SEARCH_TRANSFORM'
    );
    expect(records).toContainLogEntry(
      'OUTDATED_DOCUMENTS_SEARCH_TRANSFORM -> OUTDATED_DOCUMENTS_SEARCH_BULK_INDEX'
    );
    expect(records).toContainLogEntry(
      'OUTDATED_DOCUMENTS_SEARCH_BULK_INDEX -> OUTDATED_DOCUMENTS_SEARCH_READ'
    );
    expect(records).toContainLogEntry(
      'OUTDATED_DOCUMENTS_SEARCH_READ -> OUTDATED_DOCUMENTS_SEARCH_CLOSE_PIT'
    );
    expect(records).toContainLogEntry(
      'OUTDATED_DOCUMENTS_SEARCH_CLOSE_PIT -> OUTDATED_DOCUMENTS_SEARCH_REFRESH'
    );
    expect(records).toContainLogEntry(
      'OUTDATED_DOCUMENTS_SEARCH_REFRESH -> UPDATE_DOCUMENT_MODEL_VERSIONS'
    );
    expect(records).toContainLogEntry(
      'UPDATE_DOCUMENT_MODEL_VERSIONS -> UPDATE_DOCUMENT_MODEL_VERSIONS_WAIT_FOR_INSTANCES'
    );
    expect(records).toContainLogEntry('UPDATE_DOCUMENT_MODEL_VERSIONS_WAIT_FOR_INSTANCES -> DONE');

    expect(records).toContainLogEntry('Migration completed');
  });
});
