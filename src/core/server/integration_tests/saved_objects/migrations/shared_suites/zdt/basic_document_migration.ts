/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import fs from 'fs/promises';
import { range, sortBy } from 'lodash';
import { SavedObjectsBulkCreateObject } from '@kbn/core-saved-objects-api-server';
import '../../jest_matchers';
import { getKibanaMigratorTestKit } from '../../kibana_migrator_test_kit';
import { delay, parseLogFile } from '../../test_utils';
import { EsRunner, EsServer } from '../../test_types';
import {
  getBaseMigratorParams,
  getSampleAType,
  getSampleBType,
} from '../../fixtures/zdt_base.fixtures';

export function createBasicDocumentsMigrationTest({
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
      attributes: {
        keyword: `a_${number}`,
        boolean: true,
      },
    }));

    await savedObjectsRepository.bulkCreate(sampleAObjs);

    const sampleBObjs = range(5).map<SavedObjectsBulkCreateObject>((number) => ({
      id: `b-${number}`,
      type: 'sample_b',
      attributes: {
        text: `i am number ${number}`,
        text2: `some static text`,
      },
    }));

    await savedObjectsRepository.bulkCreate(sampleBObjs);
  };

  it('migrates the documents', async () => {
    await createBaseline();

    const typeA = getSampleAType();
    const typeB = getSampleBType();

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

    // typeB -> we add two new model version with migrations

    typeB.modelVersions = {
      ...typeB.modelVersions,
      '2': {
        changes: [
          {
            type: 'data_backfill',
            backfillFn: (doc) => {
              return {
                attributes: {
                  text2: `${doc.attributes.text2} - mig2`,
                },
              };
            },
          },
        ],
      },
      '3': {
        changes: [
          {
            type: 'data_backfill',
            backfillFn: (doc) => {
              return {
                attributes: {
                  text2: `${doc.attributes.text2} - mig3`,
                },
              };
            },
          },
        ],
      },
    };

    const { runMigrations, client, savedObjectsRepository } = await getKibanaMigratorTestKit({
      ...getBaseMigratorParams(),
      logFilePath,
      types: [typeA, typeB],
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
        sample_b: typeB.mappings,
      })
    );

    expect(mappingMeta.docVersions).toEqual({
      sample_a: '10.2.0',
      sample_b: '10.3.0',
    });

    const { saved_objects: sampleADocs } = await savedObjectsRepository.find({ type: 'sample_a' });
    const { saved_objects: sampleBDocs } = await savedObjectsRepository.find({ type: 'sample_b' });

    expect(sampleADocs).toHaveLength(5);
    expect(sampleBDocs).toHaveLength(5);

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

    const sampleBData = sortBy(sampleBDocs, 'id').map((object) => ({
      id: object.id,
      type: object.type,
      attributes: object.attributes,
    }));

    expect(sampleBData).toEqual([
      {
        id: 'b-0',
        type: 'sample_b',
        attributes: { text: 'i am number 0', text2: 'some static text - mig2 - mig3' },
      },
      {
        id: 'b-1',
        type: 'sample_b',
        attributes: { text: 'i am number 1', text2: 'some static text - mig2 - mig3' },
      },
      {
        id: 'b-2',
        type: 'sample_b',
        attributes: { text: 'i am number 2', text2: 'some static text - mig2 - mig3' },
      },
      {
        id: 'b-3',
        type: 'sample_b',
        attributes: { text: 'i am number 3', text2: 'some static text - mig2 - mig3' },
      },
      {
        id: 'b-4',
        type: 'sample_b',
        attributes: { text: 'i am number 4', text2: 'some static text - mig2 - mig3' },
      },
    ]);

    const records = await parseLogFile(logFilePath);
    expect(records).toContainLogEntry('Starting to process 10 documents');
    expect(records).toContainLogEntry('Migration completed');
  });
}
