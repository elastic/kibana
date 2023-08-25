/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { pick, range } from 'lodash';
import Path from 'path';
import fs from 'fs/promises';
import { type TestElasticsearchUtils } from '@kbn/core-test-helpers-kbn-server';
import '../jest_matchers';
import { ISavedObjectsRepository } from '@kbn/core-saved-objects-api-server';
import { SavedObjectsModelVersionMap } from '@kbn/core-saved-objects-server';
import { getKibanaMigratorTestKit, startElasticsearch } from '../kibana_migrator_test_kit';
import { delay, createType } from '../test_utils';
import { getBaseMigratorParams } from '../fixtures/zdt_base.fixtures';
import { SavedObjectsBulkCreateObject } from '@kbn/core-saved-objects-api-server';

export const logFilePath = Path.join(__dirname, 'sor_higher.test.log');

describe('Higher version doc conversion', () => {
  let esServer: TestElasticsearchUtils['es'];
  let repositoryV1: ISavedObjectsRepository;
  let repositoryV2: ISavedObjectsRepository;

  const getTestType = ({ includeVersion2 }: { includeVersion2: boolean }) => {
    const modelVersions: SavedObjectsModelVersionMap = {
      1: {
        changes: [],
        schemas: {
          forwardCompatibility: (attrs: any) => {
            return pick(attrs, 'text', 'bool');
          },
        },
      },
    };

    if (includeVersion2) {
      modelVersions[2] = {
        changes: [
          {
            type: 'data_backfill',
            backfillFn: (document) => {
              return { attributes: { newField: 'someValue' } };
            },
          },
        ],
        schemas: {
          forwardCompatibility: (attrs: any) => {
            return pick(attrs, 'text', 'bool', 'newField');
          },
        },
      };
    }

    return createType({
      name: 'test-type',
      switchToModelVersionAt: '8.0.0',
      modelVersions,
      mappings: {
        dynamic: false,
        properties: {
          text: { type: 'text' },
          bool: { type: 'boolean' },
        },
      },
    });
  };

  const createBaseline = async () => {
    const testTypeV1 = getTestType({ includeVersion2: false });
    const testTypeV2 = getTestType({ includeVersion2: true });

    const {
      runMigrations,
      savedObjectsRepository: savedObjectsRepositoryV1,
      client,
    } = await getKibanaMigratorTestKit({
      ...getBaseMigratorParams(),
      logFilePath,
      types: [testTypeV1],
    });
    await runMigrations();

    const sampleAObjs = range(5).map<SavedObjectsBulkCreateObject>((number) => ({
      id: `doc-${number}`,
      type: 'test-type',
      attributes: {
        text: `a_${number}`,
        bool: true,
      },
    }));

    await savedObjectsRepositoryV1.bulkCreate(sampleAObjs, { refresh: 'wait_for' });

    const { runMigrations: runMigrationsAgain, savedObjectsRepository: savedObjectsRepositoryV2 } =
      await getKibanaMigratorTestKit({
        ...getBaseMigratorParams(),
        logFilePath,
        types: [testTypeV2],
      });
    await runMigrationsAgain();

    // returns the repository for v1
    return { savedObjectsRepositoryV1, savedObjectsRepositoryV2, client };
  };

  beforeAll(async () => {
    await fs.unlink(logFilePath).catch(() => {});
    esServer = await startElasticsearch();

    const { savedObjectsRepositoryV1: sorV1, savedObjectsRepositoryV2: sorV2 } =
      await createBaseline();

    repositoryV1 = sorV1;
    repositoryV2 = sorV2;
  });

  afterAll(async () => {
    await esServer?.stop();
    await delay(10);
  });

  describe('#get', () => {
    it('returns the documents with the correct shape', async () => {
      const docV1 = await repositoryV1.get('test-type', 'doc-1');
      expect(docV1.attributes).toEqual({
        bool: true,
        text: 'a_1',
      });

      const docV2 = await repositoryV2.get('test-type', 'doc-1');
      expect(docV2.attributes).toEqual({
        bool: true,
        text: 'a_1',
        newField: 'someValue',
      });
    });
    it('throws error for documents using higher version model than current', async () => {
      try {
        await repositoryV1.get('test-type', 'doc-1', {
          downwardConversion: 'forbid',
        });
      } catch (err) {
        expect(err.message).toBe(
          '[NewerModelVersionError]: Document "doc-1" belongs to a more recent version of Kibana [10.2.0] when the last known version is [10.1.0].'
        );
      }
    });
    it("doesn't throw error for documents using current version model when 'downwardConversion' is 'forbid'", async () => {
      try {
        await repositoryV2.get('test-type', 'doc-1', {
          downwardConversion: 'forbid',
        });
      } catch (err) {
        expect(err).toBeUndefined();
      }
    });
  });

  describe('#bulkGet', () => {
    it('returns the documents with the correct shape', async () => {
      const docsV1 = await repositoryV1.bulkGet([{ type: 'test-type', id: 'doc-1' }]);
      expect(docsV1.saved_objects[0].attributes).toEqual({
        bool: true,
        text: 'a_1',
      });

      const docV2 = await repositoryV2.bulkGet([{ type: 'test-type', id: 'doc-1' }]);
      expect(docV2.saved_objects[0].attributes).toEqual({
        bool: true,
        text: 'a_1',
        newField: 'someValue',
      });
    });
    it('throws error for documents using higher version model than current', async () => {
      try {
        await repositoryV2.bulkGet([{ type: 'test-type', id: 'doc-1' }], {
          downwardConversion: 'forbid',
        });
      } catch (err) {
        expect(err.message).toBe(
          '[NewerModelVersionError]: Document "doc-1" belongs to a more recent version of Kibana [10.2.0] when the last known version is [10.1.0].'
        );
      }
    });
    it("doesn't throw error for documents using current version model when 'downwardConversion' is 'forbid'", async () => {
      try {
        await repositoryV2.get('test-type', 'doc-1', {
          downwardConversion: 'forbid',
        });
      } catch (err) {
        expect(err).toBeUndefined();
      }
    });
  });

  describe('#resolve', () => {
    it('returns the documents with the correct shape', async () => {
      const docV1 = await repositoryV1.resolve('test-type', 'doc-1');
      expect(docV1.saved_object.attributes).toEqual({
        bool: true,
        text: 'a_1',
      });

      const docV2 = await repositoryV2.resolve('test-type', 'doc-1');
      expect(docV2.saved_object.attributes).toEqual({
        bool: true,
        text: 'a_1',
        newField: 'someValue',
      });
    });
    it('throws error for documents using higher version model than current', async () => {
      try {
        await repositoryV2.resolve('test-type', 'doc-1', {
          downwardConversion: 'forbid',
        });
      } catch (err) {
        expect(err.message).toBe(
          '[NewerModelVersionError]: Document "doc-1" belongs to a more recent version of Kibana [10.2.0] when the last known version is [10.1.0].'
        );
      }
    });
    it("doesn't throw error for documents using current version model when 'downwardConversion' is 'forbid'", async () => {
      try {
        await repositoryV2.get('test-type', 'doc-1', {
          downwardConversion: 'forbid',
        });
      } catch (err) {
        expect(err).toBeUndefined();
      }
    });
  });

  describe('#bulkResolve', () => {
    it('returns the documents with the correct shape', async () => {
      const docsV1 = await repositoryV1.bulkResolve([{ type: 'test-type', id: 'doc-1' }]);
      expect(docsV1.resolved_objects[0].saved_object.attributes).toEqual({
        bool: true,
        text: 'a_1',
      });

      const docV2 = await repositoryV2.bulkResolve([{ type: 'test-type', id: 'doc-1' }]);
      expect(docV2.resolved_objects[0].saved_object.attributes).toEqual({
        bool: true,
        text: 'a_1',
        newField: 'someValue',
      });
    });
    it('throws error for documents using higher version model than current', async () => {
      try {
        await repositoryV2.bulkResolve([{ type: 'test-type', id: 'doc-1' }], {
          downwardConversion: 'forbid',
        });
      } catch (err) {
        expect(err.message).toBe(
          '[NewerModelVersionError]: Document "doc-1" belongs to a more recent version of Kibana [10.2.0] when the last known version is [10.1.0].'
        );
      }
    });
    it("doesn't throw error for documents using current version model when 'downwardConversion' is 'forbid'", async () => {
      try {
        await repositoryV2.get('test-type', 'doc-1', {
          downwardConversion: 'forbid',
        });
      } catch (err) {
        expect(err).toBeUndefined();
      }
    });
  });
});
