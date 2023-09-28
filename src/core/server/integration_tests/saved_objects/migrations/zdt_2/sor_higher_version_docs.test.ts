/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { pick, range } from 'lodash';
import Path from 'path';
import '../jest_matchers';
import { ISavedObjectsRepository } from '@kbn/core-saved-objects-api-server';
import { createType } from '../test_utils';
import { SavedObjectsBulkCreateObject } from '@kbn/core-saved-objects-api-server';
import { createModelVersionTestBed } from '@kbn/core-test-helpers-model-versions';

export const logFilePath = Path.join(__dirname, 'sor_higher.test.log');

const modelVersionTestBed = createModelVersionTestBed();

describe('Higher version doc conversion', () => {
  let repositoryV1: ISavedObjectsRepository;
  let repositoryV2: ISavedObjectsRepository;

  const getTestType = () => {
    return createType({
      name: 'test-type',
      switchToModelVersionAt: '8.0.0',
      modelVersions: {
        1: {
          changes: [],
          schemas: {
            forwardCompatibility: (attrs: any) => {
              return pick(attrs, 'text', 'bool');
            },
          },
        },
        2: {
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
        },
      },
      mappings: {
        dynamic: false,
        properties: {
          text: { type: 'text' },
          bool: { type: 'boolean' },
        },
      },
    });
  };

  beforeAll(async () => {
    await modelVersionTestBed.startES();

    const testkit = await modelVersionTestBed.prepareTestKit({
      logFilePath,
      savedObjectDefinitions: [
        {
          definition: getTestType(),
          modelVersionBefore: 1,
          modelVersionAfter: 2,
        },
      ],
      objectsToCreateBetween: range(5).map<SavedObjectsBulkCreateObject>((number) => ({
        id: `doc-${number}`,
        type: 'test-type',
        attributes: {
          text: `a_${number}`,
          bool: true,
        },
      })),
    });

    repositoryV1 = testkit.repositoryBefore;
    repositoryV2 = testkit.repositoryAfter;
  });

  afterAll(async () => {
    await modelVersionTestBed.stopES();
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
  });
});
