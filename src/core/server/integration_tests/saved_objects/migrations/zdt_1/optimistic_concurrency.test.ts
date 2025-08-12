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
import { SavedObjectsBulkCreateObject } from '@kbn/core-saved-objects-api-server';
import '../jest_matchers';
import { getKibanaMigratorTestKit, startElasticsearch } from '../kibana_migrator_test_kit';
import { parseLogFile } from '../test_utils';
import {
  getBaseMigratorParams,
  getSampleAType,
  getSampleBType,
} from '../fixtures/zdt_base.fixtures';
import {
  SavedObjectModelTransformationDoc,
  SavedObjectModelUnsafeTransformFn,
} from '@kbn/core-saved-objects-server';
import * as bulkOverwriteModule from '@kbn/core-saved-objects-migration-server-internal/src/actions/bulk_overwrite_transformed_documents';

export const logFilePath = Path.join(__dirname, 'optimistic_concurrency.test.log');

describe('ZDT upgrades - encountering conversion failures', () => {
  let esServer: TestElasticsearchUtils['es'];

  beforeAll(async () => {
    esServer = await startElasticsearch();
  });

  afterAll(async () => {
    await esServer?.stop();
  });

  beforeEach(async () => {
    await fs.unlink(logFilePath).catch(() => {});
  });

  describe('optimistic concurrency tests', () => {
    it('doesnt overwrite changes made while migrating', async () => {
      const { runMigrations, savedObjectsRepository } = await prepareScenario({
        discardCorruptObjects: false,
      });
      const originalImplementation = bulkOverwriteModule.bulkOverwriteTransformedDocuments;

      const spy = jest.spyOn(bulkOverwriteModule, 'bulkOverwriteTransformedDocuments');

      spy.mockImplementation((...args) => {
        return () =>
          Promise.all(
            ['a-0', 'a-3', 'a-4'].map((id) =>
              savedObjectsRepository.update('sample_a', id, {
                keyword: 'concurrent update that shouldnt be overwritten',
              })
            )
          ).then(() => {
            return originalImplementation(...args)();
          });
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

      expect(sampleADocs).toMatchInlineSnapshot(`
        Array [
          Object {
            "attributes": Object {
              "boolean": true,
              "keyword": "concurrent update that shouldnt be overwritten",
            },
            "coreMigrationVersion": "8.8.0",
            "created_at": "2025-08-12T09:37:18.267Z",
            "id": "a-4",
            "managed": false,
            "namespaces": Array [
              "default",
            ],
            "references": Array [],
            "score": 0,
            "sort": undefined,
            "type": "sample_a",
            "typeMigrationVersion": "10.2.0",
            "updated_at": "2025-08-12T09:37:25.650Z",
            "version": "WzIwLDFd",
          },
          Object {
            "attributes": Object {
              "boolean": true,
              "keyword": "concurrent update that shouldnt be overwritten",
            },
            "coreMigrationVersion": "8.8.0",
            "created_at": "2025-08-12T09:37:18.267Z",
            "id": "a-3",
            "managed": false,
            "namespaces": Array [
              "default",
            ],
            "references": Array [],
            "score": 0,
            "sort": undefined,
            "type": "sample_a",
            "typeMigrationVersion": "10.2.0",
            "updated_at": "2025-08-12T09:37:25.651Z",
            "version": "WzIyLDFd",
          },
          Object {
            "attributes": Object {
              "boolean": true,
              "keyword": "concurrent update that shouldnt be overwritten",
            },
            "coreMigrationVersion": "8.8.0",
            "created_at": "2025-08-12T09:37:18.267Z",
            "id": "a-0",
            "managed": false,
            "namespaces": Array [
              "default",
            ],
            "references": Array [],
            "score": 0,
            "sort": undefined,
            "type": "sample_a",
            "typeMigrationVersion": "10.2.0",
            "updated_at": "2025-08-12T09:37:25.651Z",
            "version": "WzIxLDFd",
          },
          Object {
            "attributes": Object {
              "boolean": true,
              "keyword": "updated by the migrator",
            },
            "coreMigrationVersion": "8.8.0",
            "created_at": "2025-08-12T09:37:18.267Z",
            "id": "a-1",
            "managed": false,
            "namespaces": Array [
              "default",
            ],
            "references": Array [],
            "score": 0,
            "sort": undefined,
            "type": "sample_a",
            "typeMigrationVersion": "10.2.0",
            "updated_at": "2025-08-12T09:37:18.267Z",
            "version": "WzIzLDFd",
          },
          Object {
            "attributes": Object {
              "boolean": true,
              "keyword": "updated by the migrator",
            },
            "coreMigrationVersion": "8.8.0",
            "created_at": "2025-08-12T09:37:18.267Z",
            "id": "a-2",
            "managed": false,
            "namespaces": Array [
              "default",
            ],
            "references": Array [],
            "score": 0,
            "sort": undefined,
            "type": "sample_a",
            "typeMigrationVersion": "10.2.0",
            "updated_at": "2025-08-12T09:37:18.267Z",
            "version": "WzI0LDFd",
          },
        ]
      `);

      // This ones shouldn't change
      expect(sampleBDocs).toMatchInlineSnapshot(`
        Array [
          Object {
            "attributes": Object {
              "text": "i am number 0",
              "text2": "some static text",
            },
            "coreMigrationVersion": "8.8.0",
            "created_at": "2025-08-12T09:37:19.176Z",
            "id": "b-0",
            "managed": false,
            "namespaces": Array [
              "default",
            ],
            "references": Array [],
            "score": 0,
            "sort": undefined,
            "type": "sample_b",
            "typeMigrationVersion": "10.2.0",
            "updated_at": "2025-08-12T09:37:19.176Z",
            "version": "WzI1LDFd",
          },
          Object {
            "attributes": Object {
              "text": "i am number 1",
              "text2": "some static text",
            },
            "coreMigrationVersion": "8.8.0",
            "created_at": "2025-08-12T09:37:19.176Z",
            "id": "b-1",
            "managed": false,
            "namespaces": Array [
              "default",
            ],
            "references": Array [],
            "score": 0,
            "sort": undefined,
            "type": "sample_b",
            "typeMigrationVersion": "10.2.0",
            "updated_at": "2025-08-12T09:37:19.176Z",
            "version": "WzI2LDFd",
          },
          Object {
            "attributes": Object {
              "text": "i am number 2",
              "text2": "some static text",
            },
            "coreMigrationVersion": "8.8.0",
            "created_at": "2025-08-12T09:37:19.176Z",
            "id": "b-2",
            "managed": false,
            "namespaces": Array [
              "default",
            ],
            "references": Array [],
            "score": 0,
            "sort": undefined,
            "type": "sample_b",
            "typeMigrationVersion": "10.2.0",
            "updated_at": "2025-08-12T09:37:19.176Z",
            "version": "WzI3LDFd",
          },
          Object {
            "attributes": Object {
              "text": "i am number 3",
              "text2": "some static text",
            },
            "coreMigrationVersion": "8.8.0",
            "created_at": "2025-08-12T09:37:19.176Z",
            "id": "b-3",
            "managed": false,
            "namespaces": Array [
              "default",
            ],
            "references": Array [],
            "score": 0,
            "sort": undefined,
            "type": "sample_b",
            "typeMigrationVersion": "10.2.0",
            "updated_at": "2025-08-12T09:37:19.176Z",
            "version": "WzI4LDFd",
          },
          Object {
            "attributes": Object {
              "text": "i am number 4",
              "text2": "some static text",
            },
            "coreMigrationVersion": "8.8.0",
            "created_at": "2025-08-12T09:37:19.176Z",
            "id": "b-4",
            "managed": false,
            "namespaces": Array [
              "default",
            ],
            "references": Array [],
            "score": 0,
            "sort": undefined,
            "type": "sample_b",
            "typeMigrationVersion": "10.2.0",
            "updated_at": "2025-08-12T09:37:19.176Z",
            "version": "WzI5LDFd",
          },
        ]
      `);
    });
  });

  const prepareScenario = async ({ discardCorruptObjects }: { discardCorruptObjects: boolean }) => {
    await createBaseline();

    const typeA = getSampleAType();
    const typeB = getSampleBType();

    const transformFunc: SavedObjectModelUnsafeTransformFn<any, any> = (
      doc: SavedObjectModelTransformationDoc<any>
    ) => {
      const attributes: any = {
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

    typeB.modelVersions = {
      ...typeB.modelVersions,
      '2': {
        changes: [
          {
            type: 'unsafe_transform',
            transformFn: (typeSafeGuard) =>
              typeSafeGuard((doc) => {
                return { document: doc };
              }),
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
