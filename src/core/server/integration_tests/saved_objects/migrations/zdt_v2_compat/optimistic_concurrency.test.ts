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
import { range } from 'lodash';
import { type TestElasticsearchUtils } from '@kbn/core-test-helpers-kbn-server';
import type { SavedObjectsBulkCreateObject } from '@kbn/core-saved-objects-api-server';
import '../jest_matchers';
import { getKibanaMigratorTestKit, startElasticsearch } from '@kbn/migrator-test-kit';
import { parseLogFile } from '../test_utils';
import { getBaseMigratorParams, getSampleAType } from '../fixtures/zdt_base.fixtures';
import type {
  SavedObjectModelTransformationDoc,
  SavedObjectModelUnsafeTransformFn,
} from '@kbn/core-saved-objects-server';

export const logFilePath = Path.join(__dirname, 'optimistic_concurrency.test.log');

interface TestSOType {
  boolean: boolean;
  keyword: string;
}

describe('ZDT & V2 upgrades - optimistic concurrency tests', () => {
  let esServer: TestElasticsearchUtils['es'];

  beforeAll(async () => {
    esServer = await startElasticsearch();
  });

  afterAll(async () => {
    await esServer?.stop();
  });

  beforeEach(async () => {
    await fs.unlink(logFilePath).catch(() => {});
    jest.clearAllMocks();
  });

  it.each(['v2', 'zdt'] as const)(
    'doesnt overwrite changes made while migrating (%s)',
    async (migrationAlgorithm) => {
      const { runMigrations, savedObjectsRepository, client } = await prepareScenario(
        migrationAlgorithm
      );

      const originalBulkImplementation = client.bulk;
      const spy = jest.spyOn(client, 'bulk');
      spy.mockImplementation(function (this: typeof client, ...args) {
        // let's run some updates before we run the bulk operations
        return Promise.all(
          ['a-0', 'a-3', 'a-4'].map((id) =>
            savedObjectsRepository.update('sample_a', id, {
              keyword: 'concurrent update that shouldnt be overwritten',
            })
          )
        ).then(() => {
          return originalBulkImplementation.apply(this, args);
        });
      });

      await runMigrations();

      const records = await parseLogFile(logFilePath);
      expect(records).toContainLogEntry('-> DONE');

      const { saved_objects: sampleADocs } = await savedObjectsRepository.find<TestSOType>({
        type: 'sample_a',
      });

      expect(
        sampleADocs
          .map((doc) => ({
            id: doc.id,
            keyword: doc.attributes.keyword,
          }))
          .sort((a, b) => a.id.localeCompare(b.id))
      ).toMatchInlineSnapshot(`
        Array [
          Object {
            "id": "a-0",
            "keyword": "concurrent update that shouldnt be overwritten",
          },
          Object {
            "id": "a-1",
            "keyword": "updated by the migrator",
          },
          Object {
            "id": "a-2",
            "keyword": "updated by the migrator",
          },
          Object {
            "id": "a-3",
            "keyword": "concurrent update that shouldnt be overwritten",
          },
          Object {
            "id": "a-4",
            "keyword": "concurrent update that shouldnt be overwritten",
          },
        ]
      `);
    }
  );

  const prepareScenario = async (migrationAlgorithm: 'zdt' | 'v2') => {
    await createBaseline();

    const typeA = getSampleAType();

    const transformFunc: SavedObjectModelUnsafeTransformFn<TestSOType, TestSOType> = (
      doc: SavedObjectModelTransformationDoc<TestSOType>
    ) => {
      const attributes = {
        ...doc.attributes,
        keyword: 'updated by the migrator',
      };
      return { document: { ...doc, attributes } };
    };
    typeA.modelVersions = {
      ...typeA.modelVersions,
      '2': {
        changes: [
          {
            type: 'unsafe_transform',
            transformFn: (typeSafeGuard) => typeSafeGuard(transformFunc),
          },
        ],
      },
    };

    const { runMigrations, client, savedObjectsRepository } = await getKibanaMigratorTestKit({
      ...getBaseMigratorParams({ migrationAlgorithm }),
      logFilePath,
      types: [typeA],
    });

    return { runMigrations, client, savedObjectsRepository };
  };

  const createBaseline = async () => {
    const { runMigrations, savedObjectsRepository, client } = await getKibanaMigratorTestKit({
      ...getBaseMigratorParams(),
      types: [getSampleAType()],
    });

    try {
      await client.indices.delete({ index: '.kibana_1' });
    } catch (e) {
      /* index wasn't created, that's fine */
    }

    await runMigrations();

    const sampleAObjs = range(5).map<SavedObjectsBulkCreateObject<TestSOType>>((number) => ({
      id: `a-${number}`,
      type: 'sample_a',
      attributes: {
        keyword: `a_${number}`,
        boolean: true,
      },
    }));
    await savedObjectsRepository.bulkCreate<TestSOType>(sampleAObjs);
  };
});
