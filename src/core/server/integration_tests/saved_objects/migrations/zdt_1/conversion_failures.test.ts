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
} from '../fixtures/zdt_base.fixtures';

export const logFilePath = Path.join(__dirname, 'conversion_failures.test.log');

describe('ZDT upgrades - encountering conversion failures', () => {
  let esServer: TestElasticsearchUtils['es'];

  beforeAll(async () => {
    esServer = await startElasticsearch();
  });

  afterAll(async () => {
    await esServer?.stop();
    await delay(10);
  });

  beforeEach(async () => {
    await fs.unlink(logFilePath).catch(() => {});
  });

  describe('when discardCorruptObjects is true', () => {
    it('completes the migration and discard the documents', async () => {
      const { runMigrations, savedObjectsRepository } = await prepareScenario({
        discardCorruptObjects: true,
      });

      await runMigrations();

      const records = await parseLogFile(logFilePath);
      expect(records).toContainLogEntry('-> DONE');

      const { saved_objects: sampleADocs } = await savedObjectsRepository.find({
        type: 'sample_a',
      });
      const { saved_objects: sampleBDocs } = await savedObjectsRepository.find({
        type: 'sample_b',
      });

      expect(sampleADocs).toHaveLength(0);
      expect(sampleBDocs.map((doc) => doc.id).sort()).toEqual(['b-1', 'b-2', 'b-3', 'b-4']);
    });
  });

  describe('when discardCorruptObjects is false', () => {
    it('fails the migration with an explicit message and keep the documents', async () => {
      const { client, runMigrations } = await prepareScenario({
        discardCorruptObjects: false,
      });

      try {
        await runMigrations();
        fail('migration should have failed');
      } catch (err) {
        const errorMessage = err.message;
        expect(errorMessage).toMatch('6 transformation errors were encountered');
        expect(errorMessage).toMatch('error from a-0');
        expect(errorMessage).toMatch('error from a-1');
        expect(errorMessage).toMatch('error from a-2');
        expect(errorMessage).toMatch('error from a-3');
        expect(errorMessage).toMatch('error from a-4');
        expect(errorMessage).toMatch('error from b-0');
      }

      const records = await parseLogFile(logFilePath);
      expect(records).toContainLogEntry('OUTDATED_DOCUMENTS_SEARCH_READ -> FATAL');

      const { kibanaIndex: index } = getBaseMigratorParams();
      await expect(
        client.count({ index, query: { term: { type: 'sample_a' } } })
      ).resolves.toHaveProperty('count', 5);
      await expect(
        client.count({ index, query: { term: { type: 'sample_b' } } })
      ).resolves.toHaveProperty('count', 5);
    });
  });

  const prepareScenario = async ({ discardCorruptObjects }: { discardCorruptObjects: boolean }) => {
    await createBaseline();

    const typeA = getSampleAType();
    const typeB = getSampleBType();

    // typeA -> migration failing all the documents
    typeA.modelVersions = {
      ...typeA.modelVersions,
      '2': {
        changes: [
          {
            type: 'data_backfill',
            transform: (doc) => {
              throw new Error(`error from ${doc.id}`);
            },
          },
        ],
      },
    };

    // typeB -> migration failing the first doc
    typeB.modelVersions = {
      ...typeB.modelVersions,
      '2': {
        changes: [
          {
            type: 'data_backfill',
            transform: (doc) => {
              if (doc.id === 'b-0') {
                throw new Error(`error from ${doc.id}`);
              }
              return { document: doc };
            },
          },
        ],
      },
    };

    const baseParams = getBaseMigratorParams();
    if (discardCorruptObjects) {
      baseParams!.settings!.migrations!.discardCorruptObjects = '8.7.0';
    }

    const { runMigrations, client, savedObjectsRepository } = await getKibanaMigratorTestKit({
      ...baseParams,
      logFilePath,
      types: [typeA, typeB],
    });

    return { runMigrations, client, savedObjectsRepository };
  };

  const createBaseline = async () => {
    const { runMigrations, savedObjectsRepository, client } = await getKibanaMigratorTestKit({
      ...getBaseMigratorParams(),
      types: [getSampleAType(), getSampleBType()],
    });

    try {
      await client.indices.delete({ index: '.kibana_1' });
    } catch (e) {
      /* index wasn't created, that's fine */
    }

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
});
