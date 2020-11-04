/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { Readable } from 'stream';
import { v4 as uuidv4 } from 'uuid';
import {
  SavedObjectsClientContract,
  SavedObjectsType,
  SavedObject,
  SavedObjectsImportError,
} from '../types';
import { savedObjectsClientMock } from '../../mocks';
import { SavedObjectsImportOptions, ISavedObjectTypeRegistry } from '..';
import { typeRegistryMock } from '../saved_objects_type_registry.mock';
import { importSavedObjectsFromStream } from './import_saved_objects';

import { collectSavedObjects } from './collect_saved_objects';
import { regenerateIds } from './regenerate_ids';
import { validateReferences } from './validate_references';
import { checkConflicts } from './check_conflicts';
import { checkOriginConflicts } from './check_origin_conflicts';
import { createSavedObjects } from './create_saved_objects';

jest.mock('./collect_saved_objects');
jest.mock('./regenerate_ids');
jest.mock('./validate_references');
jest.mock('./check_conflicts');
jest.mock('./check_origin_conflicts');
jest.mock('./create_saved_objects');

const getMockFn = <T extends (...args: any[]) => any, U>(fn: (...args: Parameters<T>) => U) =>
  fn as jest.MockedFunction<(...args: Parameters<T>) => U>;

describe('#importSavedObjectsFromStream', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // mock empty output of each of these mocked modules so the import doesn't throw an error
    getMockFn(collectSavedObjects).mockResolvedValue({
      errors: [],
      collectedObjects: [],
      importIdMap: new Map(),
    });
    getMockFn(regenerateIds).mockReturnValue(new Map());
    getMockFn(validateReferences).mockResolvedValue([]);
    getMockFn(checkConflicts).mockResolvedValue({
      errors: [],
      filteredObjects: [],
      importIdMap: new Map(),
      pendingOverwrites: new Set(),
    });
    getMockFn(checkOriginConflicts).mockResolvedValue({
      errors: [],
      importIdMap: new Map(),
      pendingOverwrites: new Set(),
    });
    getMockFn(createSavedObjects).mockResolvedValue({ errors: [], createdObjects: [] });
  });

  let readStream: Readable;
  const objectLimit = 10;
  const overwrite = (Symbol() as unknown) as boolean;
  let savedObjectsClient: jest.Mocked<SavedObjectsClientContract>;
  let typeRegistry: jest.Mocked<ISavedObjectTypeRegistry>;
  const namespace = 'some-namespace';

  const setupOptions = (createNewCopies: boolean = false): SavedObjectsImportOptions => {
    readStream = new Readable();
    savedObjectsClient = savedObjectsClientMock.create();
    typeRegistry = typeRegistryMock.create();
    typeRegistry.getType.mockImplementation(
      (type: string) =>
        ({
          // other attributes aren't needed for the purposes of injecting metadata
          management: { icon: `${type}-icon` },
        } as any)
    );
    return {
      readStream,
      objectLimit,
      overwrite,
      savedObjectsClient,
      typeRegistry,
      namespace,
      createNewCopies,
    };
  };
  const createObject = (): SavedObject<{
    title: string;
  }> => {
    return {
      type: 'foo-type',
      id: uuidv4(),
      references: [],
      attributes: { title: 'some-title' },
    };
  };
  const createError = (): SavedObjectsImportError => {
    const title = 'some-title';
    return {
      type: 'foo-type',
      id: uuidv4(),
      title: 'some-title',
      meta: { title },
      error: { type: 'conflict' },
    };
  };

  /**
   * These tests use minimal mocks which don't look realistic, but are sufficient to exercise the code paths correctly. For example, for an
   * object to be imported successfully it would need to be obtained from `collectSavedObjects`, passed to `validateReferences`, passed to
   * `checkOriginConflicts`, passed to `createSavedObjects`, and returned from that. However, for each of the tests below, we skip the
   * intermediate steps in the interest of brevity.
   */
  describe('module calls', () => {
    test('collects saved objects from stream', async () => {
      const options = setupOptions();
      const supportedTypes = ['foo-type'];
      typeRegistry.getImportableAndExportableTypes.mockReturnValue(
        supportedTypes.map((name) => ({ name })) as SavedObjectsType[]
      );

      await importSavedObjectsFromStream(options);
      expect(typeRegistry.getImportableAndExportableTypes).toHaveBeenCalled();
      const collectSavedObjectsOptions = { readStream, objectLimit, supportedTypes };
      expect(collectSavedObjects).toHaveBeenCalledWith(collectSavedObjectsOptions);
    });

    test('validates references', async () => {
      const options = setupOptions();
      const collectedObjects = [createObject()];
      getMockFn(collectSavedObjects).mockResolvedValue({
        errors: [],
        collectedObjects,
        importIdMap: new Map(),
      });

      await importSavedObjectsFromStream(options);
      expect(validateReferences).toHaveBeenCalledWith(
        collectedObjects,
        savedObjectsClient,
        namespace
      );
    });

    describe('with createNewCopies disabled', () => {
      test('does not regenerate object IDs', async () => {
        const options = setupOptions();
        const collectedObjects = [createObject()];
        getMockFn(collectSavedObjects).mockResolvedValue({
          errors: [],
          collectedObjects,
          importIdMap: new Map(),
        });

        await importSavedObjectsFromStream(options);
        expect(regenerateIds).not.toHaveBeenCalled();
      });

      test('checks conflicts', async () => {
        const options = setupOptions();
        const collectedObjects = [createObject()];
        getMockFn(collectSavedObjects).mockResolvedValue({
          errors: [],
          collectedObjects,
          importIdMap: new Map(),
        });

        await importSavedObjectsFromStream(options);
        const checkConflictsParams = {
          objects: collectedObjects,
          savedObjectsClient,
          namespace,
          ignoreRegularConflicts: overwrite,
        };
        expect(checkConflicts).toHaveBeenCalledWith(checkConflictsParams);
      });

      test('checks origin conflicts', async () => {
        const options = setupOptions();
        const filteredObjects = [createObject()];
        const importIdMap = new Map();
        getMockFn(checkConflicts).mockResolvedValue({
          errors: [],
          filteredObjects,
          importIdMap,
          pendingOverwrites: new Set(),
        });

        await importSavedObjectsFromStream(options);
        const checkOriginConflictsParams = {
          objects: filteredObjects,
          savedObjectsClient,
          typeRegistry,
          namespace,
          ignoreRegularConflicts: overwrite,
          importIdMap,
        };
        expect(checkOriginConflicts).toHaveBeenCalledWith(checkOriginConflictsParams);
      });

      test('creates saved objects', async () => {
        const options = setupOptions();
        const collectedObjects = [createObject()];
        const filteredObjects = [createObject()];
        const errors = [createError(), createError(), createError(), createError()];
        getMockFn(collectSavedObjects).mockResolvedValue({
          errors: [errors[0]],
          collectedObjects,
          importIdMap: new Map([
            ['foo', {}],
            ['bar', {}],
            ['baz', {}],
          ]),
        });
        getMockFn(validateReferences).mockResolvedValue([errors[1]]);
        getMockFn(checkConflicts).mockResolvedValue({
          errors: [errors[2]],
          filteredObjects,
          importIdMap: new Map([['bar', { id: 'newId1' }]]),
          pendingOverwrites: new Set(),
        });
        getMockFn(checkOriginConflicts).mockResolvedValue({
          errors: [errors[3]],
          importIdMap: new Map([['baz', { id: 'newId2' }]]),
          pendingOverwrites: new Set(),
        });

        await importSavedObjectsFromStream(options);
        const importIdMap = new Map([
          ['foo', {}],
          ['bar', { id: 'newId1' }],
          ['baz', { id: 'newId2' }],
        ]);
        const createSavedObjectsParams = {
          objects: collectedObjects,
          accumulatedErrors: errors,
          savedObjectsClient,
          importIdMap,
          overwrite,
          namespace,
        };
        expect(createSavedObjects).toHaveBeenCalledWith(createSavedObjectsParams);
      });
    });

    describe('with createNewCopies enabled', () => {
      test('regenerates object IDs', async () => {
        const options = setupOptions(true);
        const collectedObjects = [createObject()];
        getMockFn(collectSavedObjects).mockResolvedValue({
          errors: [],
          collectedObjects,
          importIdMap: new Map(), // doesn't matter
        });

        await importSavedObjectsFromStream(options);
        expect(regenerateIds).toHaveBeenCalledWith(collectedObjects);
      });

      test('does not check conflicts or check origin conflicts', async () => {
        const options = setupOptions(true);
        getMockFn(validateReferences).mockResolvedValue([]);

        await importSavedObjectsFromStream(options);
        expect(checkConflicts).not.toHaveBeenCalled();
        expect(checkOriginConflicts).not.toHaveBeenCalled();
      });

      test('creates saved objects', async () => {
        const options = setupOptions(true);
        const collectedObjects = [createObject()];
        const errors = [createError(), createError()];
        getMockFn(collectSavedObjects).mockResolvedValue({
          errors: [errors[0]],
          collectedObjects,
          importIdMap: new Map([
            ['foo', {}],
            ['bar', {}],
          ]),
        });
        getMockFn(validateReferences).mockResolvedValue([errors[1]]);
        // this importIdMap is not composed with the one obtained from `collectSavedObjects`
        const importIdMap = new Map().set(`id1`, { id: `newId1` });
        getMockFn(regenerateIds).mockReturnValue(importIdMap);

        await importSavedObjectsFromStream(options);
        const createSavedObjectsParams = {
          objects: collectedObjects,
          accumulatedErrors: errors,
          savedObjectsClient,
          importIdMap,
          overwrite,
          namespace,
        };
        expect(createSavedObjects).toHaveBeenCalledWith(createSavedObjectsParams);
      });
    });
  });

  describe('results', () => {
    test('returns success=true if no errors occurred', async () => {
      const options = setupOptions();

      const result = await importSavedObjectsFromStream(options);
      expect(result).toEqual({ success: true, successCount: 0 });
    });

    test('returns success=false if an error occurred', async () => {
      const options = setupOptions();
      getMockFn(collectSavedObjects).mockResolvedValue({
        errors: [createError()],
        collectedObjects: [],
        importIdMap: new Map(), // doesn't matter
      });

      const result = await importSavedObjectsFromStream(options);
      expect(result).toEqual({ success: false, successCount: 0, errors: [expect.any(Object)] });
    });

    describe('handles a mix of successes and errors and injects metadata', () => {
      const obj1 = createObject();
      const tmp = createObject();
      const obj2 = { ...tmp, destinationId: 'some-destinationId', originId: tmp.id };
      const obj3 = { ...createObject(), destinationId: 'another-destinationId' }; // empty originId
      const createdObjects = [obj1, obj2, obj3];
      const error1 = createError();
      const error2 = createError();
      // results
      const success1 = {
        type: obj1.type,
        id: obj1.id,
        meta: { title: obj1.attributes.title, icon: `${obj1.type}-icon` },
      };
      const success2 = {
        type: obj2.type,
        id: obj2.id,
        meta: { title: obj2.attributes.title, icon: `${obj2.type}-icon` },
        destinationId: obj2.destinationId,
      };
      const success3 = {
        type: obj3.type,
        id: obj3.id,
        meta: { title: obj3.attributes.title, icon: `${obj3.type}-icon` },
        destinationId: obj3.destinationId,
      };
      const errors = [error1, error2];

      test('with createNewCopies disabled', async () => {
        const options = setupOptions();
        getMockFn(checkConflicts).mockResolvedValue({
          errors: [],
          filteredObjects: [],
          importIdMap: new Map(),
          pendingOverwrites: new Set([
            `${success2.type}:${success2.id}`, // the success2 object was overwritten
            `${error2.type}:${error2.id}`, // an attempt was made to overwrite the error2 object
          ]),
        });
        getMockFn(createSavedObjects).mockResolvedValue({ errors, createdObjects });

        const result = await importSavedObjectsFromStream(options);
        // successResults only includes the imported object's type, id, and destinationId (if a new one was generated)
        const successResults = [
          success1,
          { ...success2, overwrite: true },
          // `createNewCopies` mode is not enabled, but obj3 ran into an ambiguous source conflict and it was created with an empty
          // originId; hence, this specific object is a new copy -- we would need this information for rendering the appropriate originId
          // in the client UI, and we would need it to construct a retry for this object if other objects had errors that needed to be
          // resolved
          { ...success3, createNewCopy: true },
        ];
        const errorResults = [
          { ...error1, meta: { ...error1.meta, icon: `${error1.type}-icon` } },
          { ...error2, meta: { ...error2.meta, icon: `${error2.type}-icon` }, overwrite: true },
        ];
        expect(result).toEqual({
          success: false,
          successCount: 3,
          successResults,
          errors: errorResults,
        });
      });

      test('with createNewCopies enabled', async () => {
        // however, we include it here for posterity
        const options = setupOptions(true);
        getMockFn(createSavedObjects).mockResolvedValue({ errors, createdObjects });

        const result = await importSavedObjectsFromStream(options);
        // successResults only includes the imported object's type, id, and destinationId (if a new one was generated)
        // obj2 being created with createNewCopies mode enabled isn't a realistic test case (all objects would have originId omitted)
        const successResults = [success1, success2, success3];
        const errorResults = [
          { ...error1, meta: { ...error1.meta, icon: `${error1.type}-icon` } },
          { ...error2, meta: { ...error2.meta, icon: `${error2.type}-icon` } },
        ];
        expect(result).toEqual({
          success: false,
          successCount: 3,
          successResults,
          errors: errorResults,
        });
      });
    });

    test('accumulates multiple errors', async () => {
      const options = setupOptions();
      const errors = [createError(), createError(), createError(), createError(), createError()];
      getMockFn(collectSavedObjects).mockResolvedValue({
        errors: [errors[0]],
        collectedObjects: [],
        importIdMap: new Map(), // doesn't matter
      });
      getMockFn(validateReferences).mockResolvedValue([errors[1]]);
      getMockFn(checkConflicts).mockResolvedValue({
        errors: [errors[2]],
        filteredObjects: [],
        importIdMap: new Map(), // doesn't matter
        pendingOverwrites: new Set(),
      });
      getMockFn(checkOriginConflicts).mockResolvedValue({
        errors: [errors[3]],
        importIdMap: new Map(), // doesn't matter
        pendingOverwrites: new Set(),
      });
      getMockFn(createSavedObjects).mockResolvedValue({ errors: [errors[4]], createdObjects: [] });

      const result = await importSavedObjectsFromStream(options);
      const expectedErrors = errors.map(({ type, id }) => expect.objectContaining({ type, id }));
      expect(result).toEqual({ success: false, successCount: 0, errors: expectedErrors });
    });
  });
});
