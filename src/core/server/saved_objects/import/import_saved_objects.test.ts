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
import { validateReferences } from './validate_references';
import { checkConflicts } from './check_conflicts';
import { createSavedObjects } from './create_saved_objects';

jest.mock('./collect_saved_objects');
jest.mock('./validate_references');
jest.mock('./check_conflicts');
jest.mock('./create_saved_objects');

const getMockFn = <T extends (...args: any[]) => any, U>(fn: (...args: Parameters<T>) => U) =>
  fn as jest.MockedFunction<(...args: Parameters<T>) => U>;

describe('#importSavedObjectsFromStream', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // mock empty output of each of these mocked modules so the import doesn't throw an error
    getMockFn(collectSavedObjects).mockResolvedValue({ errors: [], collectedObjects: [] });
    getMockFn(validateReferences).mockResolvedValue({ errors: [], filteredObjects: [] });
    getMockFn(checkConflicts).mockResolvedValue({
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

  const setupOptions = (): SavedObjectsImportOptions => {
    readStream = new Readable();
    savedObjectsClient = savedObjectsClientMock.create();
    typeRegistry = typeRegistryMock.create();
    return { readStream, objectLimit, overwrite, savedObjectsClient, typeRegistry, namespace };
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
   * `checkConflicts`, passed to `createSavedObjects`, and returned from that. However, for each of the tests below, we skip the
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
      getMockFn(collectSavedObjects).mockResolvedValue({ errors: [], collectedObjects });

      await importSavedObjectsFromStream(options);
      expect(validateReferences).toHaveBeenCalledWith(
        collectedObjects,
        savedObjectsClient,
        namespace
      );
    });

    test('checks conflicts', async () => {
      const options = setupOptions();
      const filteredObjects = [createObject()];
      getMockFn(validateReferences).mockResolvedValue({ errors: [], filteredObjects });

      await importSavedObjectsFromStream(options);
      const checkConflictsOptions = { savedObjectsClient, typeRegistry, namespace };
      expect(checkConflicts).toHaveBeenCalledWith(filteredObjects, checkConflictsOptions);
    });

    test('creates saved objects', async () => {
      const options = setupOptions();
      const filteredObjects = [createObject()];
      const importIdMap = new Map();
      getMockFn(checkConflicts).mockResolvedValue({ errors: [], filteredObjects, importIdMap });

      await importSavedObjectsFromStream(options);
      const createSavedObjectsOptions = { savedObjectsClient, importIdMap, overwrite, namespace };
      expect(createSavedObjects).toHaveBeenCalledWith(filteredObjects, createSavedObjectsOptions);
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
      getMockFn(collectSavedObjects).mockResolvedValue({ errors, collectedObjects: [] });

      const result = await importSavedObjectsFromStream(options);
      expect(result).toEqual({ success: false, successCount: 0, errors });
    });

    test('handles a mix of successes and errors', async () => {
      const options = setupOptions();
      const errors = [createError()];
      const obj1 = createObject();
      const obj2 = { ...createObject(), newId: 'some-newId' };
      getMockFn(createSavedObjects).mockResolvedValue({ errors, createdObjects: [obj1, obj2] });

      const result = await importSavedObjectsFromStream(options);
      // successResults only includes the imported object's type, id, and newId (if a new one was generated)
      const successResults = [
        { type: obj1.type, id: obj1.id },
        { type: obj2.type, id: obj2.id, newId: 'some-newId' },
      ];
      expect(result).toEqual({ success: false, successCount: 2, successResults, errors });
    });

    test('accumulates multiple errors', async () => {
      const options = setupOptions();
      const errors = [createError(), createError(), createError(), createError()];
      getMockFn(collectSavedObjects).mockResolvedValue({
        errors: [errors[0]],
        collectedObjects: [],
      });
      getMockFn(validateReferences).mockResolvedValue({ errors: [errors[1]], filteredObjects: [] });
      getMockFn(checkConflicts).mockResolvedValue({
        errors: [errors[2]],
        filteredObjects: [],
        importIdMap: new Map(),
      });
      getMockFn(createSavedObjects).mockResolvedValue({ errors: [errors[3]], createdObjects: [] });

      const result = await importSavedObjectsFromStream(options);
      expect(result).toEqual({ success: false, successCount: 0, errors });
    });
  });
});
