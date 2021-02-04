/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Readable } from 'stream';
import { v4 as uuidv4 } from 'uuid';
import {
  SavedObjectsClientContract,
  SavedObjectsType,
  SavedObject,
  SavedObjectsImportFailure,
  SavedObjectsImportRetry,
  SavedObjectReference,
  SavedObjectsImportWarning,
} from '../types';
import { savedObjectsClientMock } from '../../mocks';
import { ISavedObjectTypeRegistry, SavedObjectsImportHook } from '..';
import { typeRegistryMock } from '../saved_objects_type_registry.mock';
import {
  resolveSavedObjectsImportErrors,
  ResolveSavedObjectsImportErrorsOptions,
} from './resolve_import_errors';

import {
  validateRetries,
  collectSavedObjects,
  regenerateIds,
  validateReferences,
  checkConflicts,
  getImportIdMapForRetries,
  splitOverwrites,
  createSavedObjects,
  createObjectsFilter,
  executeImportHooks,
} from './lib';

jest.mock('./lib/validate_retries');
jest.mock('./lib/create_objects_filter');
jest.mock('./lib/collect_saved_objects');
jest.mock('./lib/regenerate_ids');
jest.mock('./lib/validate_references');
jest.mock('./lib/check_conflicts');
jest.mock('./lib/check_origin_conflicts');
jest.mock('./lib/split_overwrites');
jest.mock('./lib/create_saved_objects');
jest.mock('./lib/execute_import_hooks');

const getMockFn = <T extends (...args: any[]) => any, U>(fn: (...args: Parameters<T>) => U) =>
  fn as jest.MockedFunction<(...args: Parameters<T>) => U>;

describe('#importSavedObjectsFromStream', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // mock empty output of each of these mocked modules so the import doesn't throw an error
    getMockFn(createObjectsFilter).mockReturnValue(() => false);
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
      pendingOverwrites: new Set(), // not used by resolveImportErrors, but is a required return type
    });
    getMockFn(getImportIdMapForRetries).mockReturnValue(new Map());
    getMockFn(splitOverwrites).mockReturnValue({
      objectsToOverwrite: [],
      objectsToNotOverwrite: [],
    });
    getMockFn(createSavedObjects).mockResolvedValue({ errors: [], createdObjects: [] });
    getMockFn(executeImportHooks).mockResolvedValue([]);
  });

  let readStream: Readable;
  const objectLimit = 10;
  let savedObjectsClient: jest.Mocked<SavedObjectsClientContract>;
  let typeRegistry: jest.Mocked<ISavedObjectTypeRegistry>;
  const namespace = 'some-namespace';

  const setupOptions = ({
    retries = [],
    createNewCopies = false,
    getTypeImpl = (type: string) =>
      ({
        // other attributes aren't needed for the purposes of injecting metadata
        management: { icon: `${type}-icon` },
      } as any),
    importHooks = {},
  }: {
    retries?: SavedObjectsImportRetry[];
    createNewCopies?: boolean;
    getTypeImpl?: (name: string) => any;
    importHooks?: Record<string, SavedObjectsImportHook[]>;
  } = {}): ResolveSavedObjectsImportErrorsOptions => {
    readStream = new Readable();
    savedObjectsClient = savedObjectsClientMock.create();
    typeRegistry = typeRegistryMock.create();
    typeRegistry.getType.mockImplementation(getTypeImpl);

    return {
      readStream,
      objectLimit,
      retries,
      savedObjectsClient,
      typeRegistry,
      importHooks,
      // namespace and createNewCopies don't matter, as they don't change the logic in this module, they just get passed to sub-module methods
      namespace,
      createNewCopies,
    };
  };

  const createRetry = (options?: {
    id?: string;
    overwrite?: boolean;
    replaceReferences?: SavedObjectsImportRetry['replaceReferences'];
  }) => {
    const { id = uuidv4(), overwrite = false, replaceReferences = [] } = options ?? {};
    return { type: 'foo-type', id, overwrite, replaceReferences };
  };
  const createObject = (
    references?: SavedObjectReference[],
    { type = 'foo-type', title = 'some-title' }: { type?: string; title?: string } = {}
  ): SavedObject<{
    title: string;
  }> => {
    return {
      type,
      id: uuidv4(),
      references: references || [],
      attributes: { title },
    };
  };
  const createError = (): SavedObjectsImportFailure => {
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
   * `getImportIdMapForRetries`, passed to `createSavedObjects`, and returned from that. However, for each of the tests below, we skip the
   * intermediate steps in the interest of brevity.
   */
  describe('module calls', () => {
    test('validates retries', async () => {
      const retry = createRetry();
      const options = setupOptions({ retries: [retry] });

      await resolveSavedObjectsImportErrors(options);
      expect(validateRetries).toHaveBeenCalledWith([retry]);
    });

    test('creates objects filter', async () => {
      const retry = createRetry();
      const options = setupOptions({ retries: [retry] });

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
      const filter = getMockFn(createObjectsFilter).mock.results[0].value;
      const collectSavedObjectsOptions = { readStream, objectLimit, filter, supportedTypes };
      expect(collectSavedObjects).toHaveBeenCalledWith(collectSavedObjectsOptions);
    });

    test('validates references', async () => {
      const retries = [createRetry()];
      const options = setupOptions({ retries });
      const collectedObjects = [createObject()];
      getMockFn(collectSavedObjects).mockResolvedValue({
        errors: [],
        collectedObjects,
        importIdMap: new Map(), // doesn't matter
      });

      await resolveSavedObjectsImportErrors(options);
      expect(validateReferences).toHaveBeenCalledWith(
        collectedObjects,
        savedObjectsClient,
        namespace,
        retries
      );
    });

    test('execute import hooks', async () => {
      const importHooks = {
        foo: [jest.fn()],
      };
      const options = setupOptions({ importHooks });
      const collectedObjects = [createObject()];
      getMockFn(collectSavedObjects).mockResolvedValue({
        errors: [],
        collectedObjects,
        importIdMap: new Map(),
      });
      getMockFn(createSavedObjects).mockResolvedValueOnce({
        errors: [],
        createdObjects: collectedObjects,
      });

      await resolveSavedObjectsImportErrors(options);

      expect(executeImportHooks).toHaveBeenCalledWith({
        objects: collectedObjects,
        importHooks,
      });
    });

    test('uses `retries` to replace references of collected objects before validating', async () => {
      const object = createObject([{ type: 'bar-type', id: 'abc', name: 'some name' }]);
      const retries = [
        createRetry({
          id: object.id,
          replaceReferences: [{ type: 'bar-type', from: 'abc', to: 'def' }],
        }),
      ];
      const options = setupOptions({ retries });
      getMockFn(collectSavedObjects).mockResolvedValue({
        errors: [],
        collectedObjects: [object],
        importIdMap: new Map(), // doesn't matter
      });

      await resolveSavedObjectsImportErrors(options);
      const objectWithReplacedReferences = {
        ...object,
        references: [{ ...object.references[0], id: 'def' }],
      };
      expect(validateReferences).toHaveBeenCalledWith(
        [objectWithReplacedReferences],
        savedObjectsClient,
        namespace,
        retries
      );
    });

    test('checks conflicts', async () => {
      const createNewCopies = (Symbol() as unknown) as boolean;
      const retries = [createRetry()];
      const options = setupOptions({ retries, createNewCopies });
      const collectedObjects = [createObject()];
      getMockFn(collectSavedObjects).mockResolvedValue({
        errors: [],
        collectedObjects,
        importIdMap: new Map(), // doesn't matter
      });

      await resolveSavedObjectsImportErrors(options);
      const checkConflictsParams = {
        objects: collectedObjects,
        savedObjectsClient,
        namespace,
        retries,
        createNewCopies,
      };
      expect(checkConflicts).toHaveBeenCalledWith(checkConflictsParams);
    });

    test('gets import ID map for retries', async () => {
      const retries = [createRetry()];
      const createNewCopies = (Symbol() as unknown) as boolean;
      const options = setupOptions({ retries, createNewCopies });
      const filteredObjects = [createObject()];
      getMockFn(checkConflicts).mockResolvedValue({
        errors: [],
        filteredObjects,
        importIdMap: new Map(),
        pendingOverwrites: new Set(), // not used by resolveImportErrors, but is a required return type
      });

      await resolveSavedObjectsImportErrors(options);
      const getImportIdMapForRetriesParams = { objects: filteredObjects, retries, createNewCopies };
      expect(getImportIdMapForRetries).toHaveBeenCalledWith(getImportIdMapForRetriesParams);
    });

    test('splits objects to overwrite from those not to overwrite', async () => {
      const retries = [createRetry()];
      const options = setupOptions({ retries });
      const collectedObjects = [createObject()];
      getMockFn(collectSavedObjects).mockResolvedValue({
        errors: [],
        collectedObjects,
        importIdMap: new Map(), // doesn't matter
      });

      await resolveSavedObjectsImportErrors(options);
      expect(splitOverwrites).toHaveBeenCalledWith(collectedObjects, retries);
    });

    describe('with createNewCopies disabled', () => {
      test('does not regenerate object IDs', async () => {
        const options = setupOptions();
        const collectedObjects = [createObject()];
        getMockFn(collectSavedObjects).mockResolvedValue({
          errors: [],
          collectedObjects,
          importIdMap: new Map(), // doesn't matter
        });

        await resolveSavedObjectsImportErrors(options);
        expect(regenerateIds).not.toHaveBeenCalled();
      });

      test('creates saved objects', async () => {
        const options = setupOptions();
        const errors = [createError(), createError(), createError()];
        getMockFn(collectSavedObjects).mockResolvedValue({
          errors: [errors[0]],
          collectedObjects: [], // doesn't matter
          importIdMap: new Map(), // doesn't matter
        });
        getMockFn(validateReferences).mockResolvedValue([errors[1]]);
        getMockFn(checkConflicts).mockResolvedValue({
          errors: [errors[2]],
          filteredObjects: [],
          importIdMap: new Map([['foo', { id: 'someId' }]]),
          pendingOverwrites: new Set(), // not used by resolveImportErrors, but is a required return type
        });
        getMockFn(getImportIdMapForRetries).mockReturnValue(
          new Map([
            ['foo', { id: 'newId' }],
            ['bar', { id: 'anotherNewId' }],
          ])
        );
        const importIdMap = new Map([
          ['foo', { id: 'someId' }],
          ['bar', { id: 'anotherNewId' }],
        ]);
        const objectsToOverwrite = [createObject()];
        const objectsToNotOverwrite = [createObject()];
        getMockFn(splitOverwrites).mockReturnValue({ objectsToOverwrite, objectsToNotOverwrite });
        getMockFn(createSavedObjects).mockResolvedValueOnce({
          errors: [createError()], // this error will NOT be passed to the second `createSavedObjects` call
          createdObjects: [],
        });

        await resolveSavedObjectsImportErrors(options);
        const partialCreateSavedObjectsParams = {
          accumulatedErrors: errors,
          savedObjectsClient,
          importIdMap,
          namespace,
        };
        expect(createSavedObjects).toHaveBeenNthCalledWith(1, {
          ...partialCreateSavedObjectsParams,
          objects: objectsToOverwrite,
          overwrite: true,
        });
        expect(createSavedObjects).toHaveBeenNthCalledWith(2, {
          ...partialCreateSavedObjectsParams,
          objects: objectsToNotOverwrite,
        });
      });
    });

    describe('with createNewCopies enabled', () => {
      test('regenerates object IDs', async () => {
        const options = setupOptions({ createNewCopies: true });
        const collectedObjects = [createObject()];
        getMockFn(collectSavedObjects).mockResolvedValue({
          errors: [],
          collectedObjects,
          importIdMap: new Map(), // doesn't matter
        });

        await resolveSavedObjectsImportErrors(options);
        expect(regenerateIds).toHaveBeenCalledWith(collectedObjects);
      });

      test('creates saved objects', async () => {
        const options = setupOptions({ createNewCopies: true });
        const errors = [createError(), createError(), createError()];
        getMockFn(collectSavedObjects).mockResolvedValue({
          errors: [errors[0]],
          collectedObjects: [], // doesn't matter
          importIdMap: new Map(), // doesn't matter
        });
        getMockFn(validateReferences).mockResolvedValue([errors[1]]);
        getMockFn(regenerateIds).mockReturnValue(
          new Map([
            ['foo', { id: 'randomId1' }],
            ['bar', { id: 'randomId2' }],
            ['baz', { id: 'randomId3' }],
          ])
        );
        getMockFn(checkConflicts).mockResolvedValue({
          errors: [errors[2]],
          filteredObjects: [],
          importIdMap: new Map([['bar', { id: 'someId' }]]),
          pendingOverwrites: new Set(), // not used by resolveImportErrors, but is a required return type
        });
        getMockFn(getImportIdMapForRetries).mockReturnValue(
          new Map([
            ['bar', { id: 'newId' }],
            ['baz', { id: 'anotherNewId' }],
          ])
        );
        const importIdMap = new Map([
          ['foo', { id: 'randomId1' }],
          ['bar', { id: 'someId' }],
          ['baz', { id: 'anotherNewId' }],
        ]);
        const objectsToOverwrite = [createObject()];
        const objectsToNotOverwrite = [createObject()];
        getMockFn(splitOverwrites).mockReturnValue({ objectsToOverwrite, objectsToNotOverwrite });
        getMockFn(createSavedObjects).mockResolvedValueOnce({
          errors: [createError()], // this error will NOT be passed to the second `createSavedObjects` call
          createdObjects: [],
        });

        await resolveSavedObjectsImportErrors(options);
        const partialCreateSavedObjectsParams = {
          accumulatedErrors: errors,
          savedObjectsClient,
          importIdMap,
          namespace,
        };
        expect(createSavedObjects).toHaveBeenNthCalledWith(1, {
          ...partialCreateSavedObjectsParams,
          objects: objectsToOverwrite,
          overwrite: true,
        });
        expect(createSavedObjects).toHaveBeenNthCalledWith(2, {
          ...partialCreateSavedObjectsParams,
          objects: objectsToNotOverwrite,
        });
      });
    });
  });

  describe('results', () => {
    test('returns success=true if no errors occurred', async () => {
      const options = setupOptions();

      const result = await resolveSavedObjectsImportErrors(options);
      expect(result).toEqual({ success: true, successCount: 0, warnings: [] });
    });

    test('returns success=false if an error occurred', async () => {
      const options = setupOptions();
      getMockFn(collectSavedObjects).mockResolvedValue({
        errors: [createError()],
        collectedObjects: [],
        importIdMap: new Map(), // doesn't matter
      });

      const result = await resolveSavedObjectsImportErrors(options);
      expect(result).toEqual({
        success: false,
        successCount: 0,
        errors: [expect.any(Object)],
        warnings: [],
      });
    });

    test('executes import hooks', async () => {
      const options = setupOptions();
      const collectedObjects = [createObject()];
      getMockFn(collectSavedObjects).mockResolvedValue({
        errors: [],
        collectedObjects,
        importIdMap: new Map(),
      });
      getMockFn(createSavedObjects).mockResolvedValueOnce({
        errors: [],
        createdObjects: collectedObjects,
      });
      const warnings: SavedObjectsImportWarning[] = [{ type: 'simple', message: 'foo' }];
      getMockFn(executeImportHooks).mockResolvedValue(warnings);

      const result = await resolveSavedObjectsImportErrors(options);

      expect(result.warnings).toEqual(warnings);
    });

    test('handles a mix of successes and errors and injects metadata', async () => {
      const error1 = createError();
      const error2 = createError();
      const options = setupOptions({
        retries: [{ type: error2.type, id: error2.id, overwrite: true, replaceReferences: [] }],
      });
      const obj1 = createObject();
      const tmp = createObject();
      const obj2 = { ...tmp, destinationId: 'some-destinationId', originId: tmp.id };
      const obj3 = { ...createObject(), destinationId: 'another-destinationId' }; // empty originId; this is a new copy
      getMockFn(createSavedObjects).mockResolvedValueOnce({
        errors: [error1],
        createdObjects: [obj1],
      });
      getMockFn(createSavedObjects).mockResolvedValueOnce({
        errors: [error2],
        createdObjects: [obj2, obj3],
      });

      const result = await resolveSavedObjectsImportErrors(options);
      // successResults only includes the imported object's type, id, and destinationId (if a new one was generated)
      const successResults = [
        {
          type: obj1.type,
          id: obj1.id,
          meta: { title: obj1.attributes.title, icon: `${obj1.type}-icon` },
          overwrite: true,
        },
        {
          type: obj2.type,
          id: obj2.id,
          meta: { title: obj2.attributes.title, icon: `${obj2.type}-icon` },
          destinationId: obj2.destinationId,
        },
        {
          type: obj3.type,
          id: obj3.id,
          meta: { title: obj3.attributes.title, icon: `${obj3.type}-icon` },
          destinationId: obj3.destinationId,
          createNewCopy: true,
        },
      ];
      const errors = [
        { ...error1, meta: { ...error1.meta, icon: `${error1.type}-icon` } },
        { ...error2, meta: { ...error2.meta, icon: `${error2.type}-icon` }, overwrite: true },
      ];
      expect(result).toEqual({
        success: false,
        successCount: 3,
        successResults,
        errors,
        warnings: [],
      });
    });

    test('uses `type.management.getTitle` to resolve the titles', async () => {
      const obj1 = createObject([], { type: 'foo' });
      const obj2 = createObject([], { type: 'bar', title: 'bar-title' });

      const options = setupOptions({
        getTypeImpl: (type) => {
          if (type === 'foo') {
            return {
              management: { getTitle: () => 'getTitle-foo', icon: `${type}-icon` },
            };
          }
          return {
            management: { icon: `${type}-icon` },
          };
        },
      });

      getMockFn(checkConflicts).mockResolvedValue({
        errors: [],
        filteredObjects: [],
        importIdMap: new Map(),
        pendingOverwrites: new Set(),
      });
      getMockFn(createSavedObjects)
        .mockResolvedValueOnce({ errors: [], createdObjects: [obj1, obj2] })
        .mockResolvedValueOnce({ errors: [], createdObjects: [] });

      const result = await resolveSavedObjectsImportErrors(options);
      // successResults only includes the imported object's type, id, and destinationId (if a new one was generated)
      const successResults = [
        {
          type: obj1.type,
          id: obj1.id,
          overwrite: true,
          meta: { title: 'getTitle-foo', icon: `${obj1.type}-icon` },
        },
        {
          type: obj2.type,
          id: obj2.id,
          overwrite: true,
          meta: { title: 'bar-title', icon: `${obj2.type}-icon` },
        },
      ];

      expect(result).toEqual({
        success: true,
        successCount: 2,
        successResults,
        warnings: [],
      });
    });

    test('accumulates multiple errors', async () => {
      const options = setupOptions();
      const errors = [createError(), createError(), createError(), createError()];
      getMockFn(collectSavedObjects).mockResolvedValue({
        errors: [errors[0]],
        collectedObjects: [],
        importIdMap: new Map(), // doesn't matter
      });
      getMockFn(validateReferences).mockResolvedValue([errors[1]]);
      getMockFn(createSavedObjects).mockResolvedValueOnce({
        errors: [errors[2]],
        createdObjects: [],
      });
      getMockFn(createSavedObjects).mockResolvedValueOnce({
        errors: [errors[3]],
        createdObjects: [],
      });

      const result = await resolveSavedObjectsImportErrors(options);
      const expectedErrors = errors.map(({ type, id }) => expect.objectContaining({ type, id }));
      expect(result).toEqual({
        success: false,
        successCount: 0,
        errors: expectedErrors,
        warnings: [],
      });
    });
  });
});
