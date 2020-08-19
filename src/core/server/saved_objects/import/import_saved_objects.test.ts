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
    getMockFn(validateReferences).mockResolvedValue({ errors: [], filteredObjects: [] });
    getMockFn(checkConflicts).mockResolvedValue({
      errors: [],
      filteredObjects: [],
      importIdMap: new Map(),
    });
    getMockFn(checkOriginConflicts).mockResolvedValue({
      errors: [],
      filteredObjects: [],
      importIdMap: new Map(),
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
  const createObject = () => {
    return ({ type: 'foo-type', id: uuidv4() } as unknown) as SavedObject<{ title: string }>;
  };
  const createError = () => {
    return ({ type: 'foo-type', id: uuidv4() } as unknown) as SavedObjectsImportError;
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
        const filteredObjects = [createObject()];
        getMockFn(validateReferences).mockResolvedValue({ errors: [], filteredObjects });

        await importSavedObjectsFromStream(options);
        const checkConflictsParams = {
          objects: filteredObjects,
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
        const filteredObjects = [createObject()];
        const errors = [createError(), createError(), createError(), createError()];
        getMockFn(collectSavedObjects).mockResolvedValue({
          errors: [errors[0]],
          collectedObjects: [], // doesn't matter
          importIdMap: new Map([
            ['foo', {}],
            ['bar', {}],
            ['baz', {}],
          ]),
        });
        getMockFn(validateReferences).mockResolvedValue({
          errors: [errors[1]],
          filteredObjects: [], // doesn't matter
        });
        getMockFn(checkConflicts).mockResolvedValue({
          errors: [errors[2]],
          filteredObjects,
          importIdMap: new Map([['bar', { id: 'newId1' }]]),
        });
        getMockFn(checkOriginConflicts).mockResolvedValue({
          errors: [errors[3]],
          filteredObjects,
          importIdMap: new Map([['baz', { id: 'newId2' }]]),
        });

        await importSavedObjectsFromStream(options);
        const importIdMap = new Map([
          ['foo', {}],
          ['bar', { id: 'newId1' }],
          ['baz', { id: 'newId2' }],
        ]);
        const createSavedObjectsParams = {
          objects: filteredObjects,
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
        const filteredObjects = [createObject()];
        getMockFn(validateReferences).mockResolvedValue({ errors: [], filteredObjects });

        await importSavedObjectsFromStream(options);
        expect(checkConflicts).not.toHaveBeenCalled();
        expect(checkOriginConflicts).not.toHaveBeenCalled();
      });

      test('creates saved objects', async () => {
        const options = setupOptions(true);
        const filteredObjects = [createObject()];
        const errors = [createError(), createError()];
        getMockFn(collectSavedObjects).mockResolvedValue({
          errors: [errors[0]],
          collectedObjects: [], // doesn't matter
          importIdMap: new Map([
            ['foo', {}],
            ['bar', {}],
          ]),
        });
        getMockFn(validateReferences).mockResolvedValue({ errors: [errors[1]], filteredObjects });
        // this importIdMap is not composed with the one obtained from `collectSavedObjects`
        const importIdMap = new Map().set(`id1`, { id: `newId1` });
        getMockFn(regenerateIds).mockReturnValue(importIdMap);

        await importSavedObjectsFromStream(options);
        const createSavedObjectsParams = {
          objects: filteredObjects,
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
      const errors = [createError()];
      getMockFn(collectSavedObjects).mockResolvedValue({
        errors,
        collectedObjects: [],
        importIdMap: new Map(), // doesn't matter
      });

      const result = await importSavedObjectsFromStream(options);
      expect(result).toEqual({ success: false, successCount: 0, errors });
    });

    describe('handles a mix of successes and errors', () => {
      const obj1 = createObject();
      const tmp = createObject();
      const obj2 = { ...tmp, destinationId: 'some-destinationId', originId: tmp.id };
      const obj3 = { ...createObject(), destinationId: 'another-destinationId' }; // empty originId
      const createdObjects = [obj1, obj2, obj3];
      const errors = [createError()];

      test('with createNewCopies disabled', async () => {
        const options = setupOptions();
        getMockFn(createSavedObjects).mockResolvedValue({ errors, createdObjects });

        const result = await importSavedObjectsFromStream(options);
        // successResults only includes the imported object's type, id, and destinationId (if a new one was generated)
        const successResults = [
          { type: obj1.type, id: obj1.id },
          { type: obj2.type, id: obj2.id, destinationId: obj2.destinationId },
          // `createNewCopies` mode is not enabled, but obj3 ran into an ambiguous source conflict and it was created with an empty
          // originId; hence, this specific object is a new copy -- we would need this information for rendering the appropriate originId
          // in the client UI, and we would need it to construct a retry for this object if other objects had errors that needed to be
          // resolved
          {
            type: obj3.type,
            id: obj3.id,
            destinationId: obj3.destinationId,
            createNewCopy: true,
          },
        ];
        expect(result).toEqual({ success: false, successCount: 3, successResults, errors });
      });

      test('with createNewCopies enabled', async () => {
        // however, we include it here for posterity
        const options = setupOptions(true);
        getMockFn(createSavedObjects).mockResolvedValue({ errors, createdObjects });

        const result = await importSavedObjectsFromStream(options);
        // successResults only includes the imported object's type, id, and destinationId (if a new one was generated)
        const successResults = [
          { type: obj1.type, id: obj1.id },
          // obj2 being created with createNewCopies mode enabled isn't a realistic test case (all objects would have originId omitted)
          { type: obj2.type, id: obj2.id, destinationId: obj2.destinationId },
          { type: obj3.type, id: obj3.id, destinationId: obj3.destinationId },
        ];
        expect(result).toEqual({ success: false, successCount: 3, successResults, errors });
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
      getMockFn(validateReferences).mockResolvedValue({ errors: [errors[1]], filteredObjects: [] });
      getMockFn(checkConflicts).mockResolvedValue({
        errors: [errors[2]],
        filteredObjects: [],
        importIdMap: new Map(), // doesn't matters
      });
      getMockFn(checkOriginConflicts).mockResolvedValue({
        errors: [errors[3]],
        filteredObjects: [],
        importIdMap: new Map(), // doesn't matters
      });
      getMockFn(createSavedObjects).mockResolvedValue({ errors: [errors[4]], createdObjects: [] });

      const result = await importSavedObjectsFromStream(options);
      expect(result).toEqual({ success: false, successCount: 0, errors });
    });
  });
});
