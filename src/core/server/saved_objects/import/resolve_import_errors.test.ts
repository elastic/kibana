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
  SavedObjectsImportRetry,
  SavedObjectReference,
} from '../types';
import { savedObjectsClientMock } from '../../mocks';
import { SavedObjectsResolveImportErrorsOptions, ISavedObjectTypeRegistry } from '..';
import { typeRegistryMock } from '../saved_objects_type_registry.mock';
import { resolveSavedObjectsImportErrors } from './resolve_import_errors';

import { validateRetries } from './validate_retries';
import { collectSavedObjects } from './collect_saved_objects';
import { validateReferences } from './validate_references';
import { getImportIdMapForRetries } from './check_conflicts';
import { splitOverwrites } from './split_overwrites';
import { createSavedObjects } from './create_saved_objects';
import { createObjectsFilter } from './create_objects_filter';

jest.mock('./validate_retries');
jest.mock('./create_objects_filter');
jest.mock('./collect_saved_objects');
jest.mock('./validate_references');
jest.mock('./check_conflicts');
jest.mock('./split_overwrites');
jest.mock('./create_saved_objects');

const getMockFn = <T extends (...args: any[]) => any, U>(fn: (...args: Parameters<T>) => U) =>
  fn as jest.MockedFunction<(...args: Parameters<T>) => U>;

describe('#importSavedObjectsFromStream', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // mock empty output of each of these mocked modules so the import doesn't throw an error
    getMockFn(createObjectsFilter).mockReturnValue(() => false);
    getMockFn(collectSavedObjects).mockResolvedValue({ errors: [], collectedObjects: [] });
    getMockFn(validateReferences).mockResolvedValue({ errors: [], filteredObjects: [] });
    getMockFn(getImportIdMapForRetries).mockReturnValue(new Map());
    getMockFn(splitOverwrites).mockReturnValue({
      objectsToOverwrite: [],
      objectsToNotOverwrite: [],
    });
    getMockFn(createSavedObjects).mockResolvedValue({ errors: [], createdObjects: [] });
  });

  let readStream: Readable;
  const objectLimit = 10;
  let savedObjectsClient: jest.Mocked<SavedObjectsClientContract>;
  let typeRegistry: jest.Mocked<ISavedObjectTypeRegistry>;
  const namespace = 'some-namespace';

  const setupOptions = (
    retries: SavedObjectsImportRetry[] = []
  ): SavedObjectsResolveImportErrorsOptions => {
    readStream = new Readable();
    savedObjectsClient = savedObjectsClientMock.create();
    typeRegistry = typeRegistryMock.create();
    return { readStream, objectLimit, retries, savedObjectsClient, typeRegistry, namespace };
  };

  const createRetry = (options?: {
    id?: string;
    overwrite?: boolean;
    replaceReferences?: SavedObjectsImportRetry['replaceReferences'];
  }) => {
    const { id = uuidv4(), overwrite = false, replaceReferences = [] } = options ?? {};
    return { type: 'foo-type', id, overwrite, replaceReferences };
  };
  const createObject = (references?: SavedObjectReference[]) => {
    return ({ type: 'foo-type', id: uuidv4(), references } as unknown) as SavedObject<{
      title: string;
    }>;
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
    test('validates retries', async () => {
      const retry = createRetry();
      const options = setupOptions([retry]);

      await resolveSavedObjectsImportErrors(options);
      expect(validateRetries).toHaveBeenCalledWith([retry]);
    });

    test('creates objects filter', async () => {
      const retry = createRetry();
      const options = setupOptions([retry]);

      await resolveSavedObjectsImportErrors(options);
      expect(createObjectsFilter).toHaveBeenCalledWith([retry]);
    });

    test('collects saved objects from stream', async () => {
      const options = setupOptions();
      const supportedTypes = ['foo'];
      typeRegistry.getImportableAndExportableTypes.mockReturnValue(
        supportedTypes.map((name) => ({ name })) as SavedObjectsType[]
      );

      await resolveSavedObjectsImportErrors(options);
      expect(typeRegistry.getImportableAndExportableTypes).toHaveBeenCalled();
      // expect(createObjectsFilter).toHaveBeenCalled();
      const filter = getMockFn(createObjectsFilter).mock.results[0].value;
      const collectSavedObjectsOptions = { readStream, objectLimit, filter, supportedTypes };
      expect(collectSavedObjects).toHaveBeenCalledWith(collectSavedObjectsOptions);
    });

    test('validates references', async () => {
      const options = setupOptions();
      const collectedObjects = [createObject()];
      getMockFn(collectSavedObjects).mockResolvedValue({ errors: [], collectedObjects });

      await resolveSavedObjectsImportErrors(options);
      expect(validateReferences).toHaveBeenCalledWith(
        collectedObjects,
        savedObjectsClient,
        namespace
      );
    });

    test('uses `retries` to replace references of collected objects before validating', async () => {
      const object = createObject([{ type: 'bar-type', id: 'abc', name: 'some name' }]);
      const retry = createRetry({
        id: object.id,
        replaceReferences: [{ type: 'bar-type', from: 'abc', to: 'def' }],
      });
      const options = setupOptions([retry]);
      getMockFn(collectSavedObjects).mockResolvedValue({ errors: [], collectedObjects: [object] });

      await resolveSavedObjectsImportErrors(options);
      const objectWithReplacedReferences = {
        ...object,
        references: [{ ...object.references[0], id: 'def' }],
      };
      expect(validateReferences).toHaveBeenCalledWith(
        [objectWithReplacedReferences],
        savedObjectsClient,
        namespace
      );
    });

    test('checks conflicts', async () => {
      const retries = [createRetry()];
      const options = setupOptions(retries);
      const filteredObjects = [createObject()];
      getMockFn(validateReferences).mockResolvedValue({ errors: [], filteredObjects });

      await resolveSavedObjectsImportErrors(options);
      const opts = { typeRegistry, retries };
      expect(getImportIdMapForRetries).toHaveBeenCalledWith(filteredObjects, opts);
    });

    test('splits objects to ovewrite from those not to overwrite', async () => {
      const retries = [createRetry()];
      const options = setupOptions(retries);
      const filteredObjects = [createObject()];
      getMockFn(validateReferences).mockResolvedValue({
        errors: [],
        filteredObjects,
      });

      await resolveSavedObjectsImportErrors(options);
      expect(splitOverwrites).toHaveBeenCalledWith(filteredObjects, retries);
    });

    test('creates saved objects', async () => {
      const options = setupOptions();
      const importIdMap = new Map();
      getMockFn(getImportIdMapForRetries).mockReturnValue(importIdMap);
      const objectsToOverwrite = [createObject()];
      const objectsToNotOverwrite = [createObject()];
      getMockFn(splitOverwrites).mockReturnValue({ objectsToOverwrite, objectsToNotOverwrite });

      await resolveSavedObjectsImportErrors(options);
      const createSavedObjectsOptions = { savedObjectsClient, importIdMap, namespace };
      expect(createSavedObjects).toHaveBeenNthCalledWith(1, objectsToOverwrite, {
        ...createSavedObjectsOptions,
        overwrite: true,
      });
      expect(createSavedObjects).toHaveBeenNthCalledWith(
        2,
        objectsToNotOverwrite,
        createSavedObjectsOptions
      );
    });
  });

  describe('results', () => {
    test('returns success=true if no errors occurred', async () => {
      const options = setupOptions();

      const result = await resolveSavedObjectsImportErrors(options);
      expect(result).toEqual({ success: true, successCount: 0 });
    });

    test('returns success=false if an error occurred', async () => {
      const options = setupOptions();
      const errors = [createError()];
      getMockFn(collectSavedObjects).mockResolvedValue({ errors, collectedObjects: [] });

      const result = await resolveSavedObjectsImportErrors(options);
      expect(result).toEqual({ success: false, successCount: 0, errors });
    });

    test('handles a mix of successes and errors', async () => {
      const options = setupOptions();
      const errors = [createError()];
      const obj1 = createObject();
      const obj2 = { ...createObject(), newId: 'some-newId' };
      getMockFn(createSavedObjects).mockResolvedValueOnce({
        errors,
        createdObjects: [obj1],
      });
      getMockFn(createSavedObjects).mockResolvedValueOnce({
        errors: [],
        createdObjects: [obj2],
      });

      const result = await resolveSavedObjectsImportErrors(options);
      // successResults only includes the imported object's type, id, and newId (if a new one was generated)
      const successResults = [
        { type: obj1.type, id: obj1.id },
        { type: obj2.type, id: obj2.id, newId: obj2.newId },
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
      getMockFn(createSavedObjects).mockResolvedValueOnce({
        errors: [errors[2]],
        createdObjects: [],
      });
      getMockFn(createSavedObjects).mockResolvedValueOnce({
        errors: [errors[3]],
        createdObjects: [],
      });

      const result = await resolveSavedObjectsImportErrors(options);
      expect(result).toEqual({ success: false, successCount: 0, errors });
    });
  });
});
