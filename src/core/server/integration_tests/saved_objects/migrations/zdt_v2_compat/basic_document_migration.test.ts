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
import { type TestElasticsearchUtils } from '@kbn/core-test-helpers-kbn-server';
import { SavedObjectsBulkCreateObject } from '@kbn/core-saved-objects-api-server';
import '../jest_matchers';
import { getKibanaMigratorTestKit, startElasticsearch } from '../kibana_migrator_test_kit';
import { parseLogFile } from '../test_utils';
import {
  getBaseMigratorParams,
  getSampleAType,
  getLegacyType,
} from '../fixtures/zdt_base.fixtures';

const logFilePath = Path.join(__dirname, 'basic_document_migration.test.log');

describe('ZDT with v2 compat - basic document migration', () => {
  let esServer: TestElasticsearchUtils['es'];

  beforeAll(async () => {
    await fs.unlink(logFilePath).catch(() => {});
    esServer = await startElasticsearch();
  });

  afterAll(async () => {
    await esServer?.stop();
  });

  const createBaseline = async () => {
    const { runMigrations, savedObjectsRepository } = await getKibanaMigratorTestKit({
      ...getBaseMigratorParams(),
      types: [getSampleAType(), getLegacyType()],
    });
    await runMigrations();

    const sampleAObjs = range(5).map<SavedObjectsBulkCreateObject>((number) => ({
      id: `a-${number}`,
      type: 'sample_a',
      attributes: {
        keyword: `a_${number}`,
        boolean: true,
      },
    }));

    await savedObjectsRepository.bulkCreate(sampleAObjs);

    const legacyTypeObjs = range(5).map<SavedObjectsBulkCreateObject>((number) => ({
      id: `legacy-${number}`,
      type: 'legacy',
      attributes: {
        someField: `legacy ${number}`,
      },
    }));

    await savedObjectsRepository.bulkCreate(legacyTypeObjs);
  };

  it('migrates the documents', async () => {
    await createBaseline();

    const typeA = getSampleAType();
    const legacyType = getLegacyType();

    // typeA -> we add a new field and bump the model version by one with a migration

    typeA.mappings.properties = {
      ...typeA.mappings.properties,
      someAddedField: { type: 'keyword' },
    };

    typeA.modelVersions = {
      ...typeA.modelVersions,
      '2': {
        changes: [
          {
            type: 'data_backfill',
            backfillFn: (doc) => {
              return {
                attributes: {
                  someAddedField: `${doc.attributes.keyword}-mig`,
                },
              };
            },
          },
          {
            type: 'mappings_addition',
            addedMappings: {
              someAddedField: { type: 'keyword' },
            },
          },
        ],
      },
    };

    // legacyType -> we add a new migration

    legacyType.mappings.properties = {
      ...legacyType.mappings.properties,
      newField: { type: 'text' },
    };

    legacyType.migrations = {
      ...legacyType.migrations,
      '8.0.0': (document) => {
        return {
          ...document,
          attributes: {
            ...document.attributes,
            newField: `populated ${document.id}`,
          },
        };
      },
    };

    const { runMigrations, client, savedObjectsRepository } = await getKibanaMigratorTestKit({
      ...getBaseMigratorParams(),
      logFilePath,
      types: [typeA, legacyType],
    });

    await runMigrations();

    const indices = await client.indices.get({ index: '.kibana*' });
    expect(Object.keys(indices)).toEqual(['.kibana_1']);

    const index = indices['.kibana_1'];
    const mappings = index.mappings ?? {};
    const mappingMeta = mappings._meta ?? {};

    expect(mappings.properties).toEqual(
      expect.objectContaining({
        sample_a: typeA.mappings,
        legacy: legacyType.mappings,
      })
    );

    expect(mappingMeta.docVersions).toEqual({
      sample_a: '10.2.0',
      legacy: '8.0.0',
    });

    const { saved_objects: sampleADocs } = await savedObjectsRepository.find({ type: 'sample_a' });
    const { saved_objects: legacyDocs } = await savedObjectsRepository.find({ type: 'legacy' });

    expect(sampleADocs).toHaveLength(5);
    expect(legacyDocs).toHaveLength(5);

    const sampleAData = sortBy(sampleADocs, 'id').map((object) => ({
      id: object.id,
      type: object.type,
      attributes: object.attributes,
    }));

    expect(sampleAData).toEqual([
      {
        id: 'a-0',
        type: 'sample_a',
        attributes: { boolean: true, keyword: 'a_0', someAddedField: 'a_0-mig' },
      },
      {
        id: 'a-1',
        type: 'sample_a',
        attributes: { boolean: true, keyword: 'a_1', someAddedField: 'a_1-mig' },
      },
      {
        id: 'a-2',
        type: 'sample_a',
        attributes: { boolean: true, keyword: 'a_2', someAddedField: 'a_2-mig' },
      },
      {
        id: 'a-3',
        type: 'sample_a',
        attributes: { boolean: true, keyword: 'a_3', someAddedField: 'a_3-mig' },
      },
      {
        id: 'a-4',
        type: 'sample_a',
        attributes: { boolean: true, keyword: 'a_4', someAddedField: 'a_4-mig' },
      },
    ]);

    const sampleBData = sortBy(legacyDocs, 'id').map((object) => ({
      id: object.id,
      type: object.type,
      attributes: object.attributes,
    }));

    expect(sampleBData).toEqual([
      {
        id: 'legacy-0',
        type: 'legacy',
        attributes: { someField: `legacy 0`, newField: `populated legacy-0` },
      },
      {
        id: 'legacy-1',
        type: 'legacy',
        attributes: { someField: `legacy 1`, newField: `populated legacy-1` },
      },
      {
        id: 'legacy-2',
        type: 'legacy',
        attributes: { someField: `legacy 2`, newField: `populated legacy-2` },
      },
      {
        id: 'legacy-3',
        type: 'legacy',
        attributes: { someField: `legacy 3`, newField: `populated legacy-3` },
      },
      {
        id: 'legacy-4',
        type: 'legacy',
        attributes: { someField: `legacy 4`, newField: `populated legacy-4` },
      },
    ]);

    const records = await parseLogFile(logFilePath);
    expect(records).toContainLogEntry('Starting to process 10 documents');
    expect(records).toContainLogEntry('Migration completed');
  });
});
