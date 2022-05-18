/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  mockCheckReferenceOrigins,
  mockValidateRetries,
  mockCreateObjectsFilter,
  mockCollectSavedObjects,
  mockRegenerateIds,
  mockValidateReferences,
  mockCheckConflicts,
  mockCheckOriginConflicts,
  mockGetImportStateMapForRetries,
  mockSplitOverwrites,
  mockCreateSavedObjects,
  mockExecuteImportHooks,
} from './resolve_import_errors.test.mock';

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

describe('#importSavedObjectsFromStream', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // mock empty output of each of these mocked modules so the import doesn't throw an error
    mockCreateObjectsFilter.mockReturnValue(() => false);
    mockCollectSavedObjects.mockResolvedValue({
      errors: [],
      collectedObjects: [],
      importStateMap: new Map(),
    });
    mockCheckReferenceOrigins.mockResolvedValue({ importStateMap: new Map() });
    mockRegenerateIds.mockReturnValue(new Map());
    mockValidateReferences.mockResolvedValue([]);
    mockCheckConflicts.mockResolvedValue({
      errors: [],
      filteredObjects: [],
      importStateMap: new Map(),
      pendingOverwrites: new Set(),
    });
    mockCheckOriginConflicts.mockResolvedValue({
      errors: [],
      importStateMap: new Map(),
      pendingOverwrites: new Set(),
    });
    mockGetImportStateMapForRetries.mockReturnValue(new Map());
    mockSplitOverwrites.mockReturnValue({
      objectsToOverwrite: [],
      objectsToNotOverwrite: [],
    });
    mockCreateSavedObjects.mockResolvedValue({ errors: [], createdObjects: [] });
    mockExecuteImportHooks.mockResolvedValue([]);
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
      meta: { title },
      error: { type: 'conflict' },
    };
  };

  /**
   * These tests use minimal mocks which don't look realistic, but are sufficient to exercise the code paths correctly. For example, for an
   * object to be imported successfully it would need to be obtained from `collectSavedObjects`, passed to `validateReferences`, passed to
   * `getImportStateMapForRetries`, passed to `createSavedObjects`, and returned from that. However, for each of the tests below, we skip the
   * intermediate steps in the interest of brevity.
   */
  describe('module calls', () => {
    test('validates retries', async () => {
      const retry = createRetry();
      const options = setupOptions({ retries: [retry] });

      await resolveSavedObjectsImportErrors(options);
      expect(mockValidateRetries).toHaveBeenCalledWith([retry]);
    });

    test('creates objects filter', async () => {
      const retry = createRetry();
      const options = setupOptions({ retries: [retry] });

      await resolveSavedObjectsImportErrors(options);
      expect(mockCreateObjectsFilter).toHaveBeenCalledWith([retry]);
    });

    test('collects saved objects from stream', async () => {
      const options = setupOptions();
      const supportedTypes = ['foo'];
      typeRegistry.getImportableAndExportableTypes.mockReturnValue(
        supportedTypes.map((name) => ({ name })) as SavedObjectsType[]
      );

      await resolveSavedObjectsImportErrors(options);
      expect(typeRegistry.getImportableAndExportableTypes).toHaveBeenCalled();
      const filter = mockCreateObjectsFilter.mock.results[0].value;
      const mockCollectSavedObjectsOptions = { readStream, objectLimit, filter, supportedTypes };
      expect(mockCollectSavedObjects).toHaveBeenCalledWith(mockCollectSavedObjectsOptions);
    });

    test('checks reference origins', async () => {
      const retries = [createRetry()];
      const options = setupOptions({ retries });
      const collectedObjects = [createObject()];
      const importStateMap = new Map([
        [`${collectedObjects[0].type}:${collectedObjects[0].id}`, {}],
        [`foo:bar`, { isOnlyReference: true }],
      ]);
      mockCollectSavedObjects.mockResolvedValue({
        errors: [],
        collectedObjects,
        importStateMap,
      });

      await resolveSavedObjectsImportErrors(options);
      expect(mockCheckReferenceOrigins).toHaveBeenCalledWith({
        savedObjectsClient,
        typeRegistry,
        namespace,
        importStateMap,
      });
    });

    test('validates references', async () => {
      const retries = [createRetry()];
      const options = setupOptions({ retries });
      const collectedObjects = [createObject()];
      mockCollectSavedObjects.mockResolvedValue({
        errors: [],
        collectedObjects,
        importStateMap: new Map([
          [`${collectedObjects[0].type}:${collectedObjects[0].id}`, {}],
          [`foo:bar`, { isOnlyReference: true }],
        ]),
      });
      mockCheckReferenceOrigins.mockResolvedValue({
        importStateMap: new Map([[`foo:bar`, { isOnlyReference: true, id: 'baz' }]]),
      });

      await resolveSavedObjectsImportErrors(options);
      expect(mockValidateReferences).toHaveBeenCalledWith({
        objects: collectedObjects,
        savedObjectsClient,
        namespace,
        importStateMap: new Map([
          // This importStateMap is a combination of the other two
          [`${collectedObjects[0].type}:${collectedObjects[0].id}`, {}],
          [`foo:bar`, { isOnlyReference: true, id: 'baz' }],
        ]),
        retries,
      });
    });

    test('execute import hooks', async () => {
      const importHooks = {
        foo: [jest.fn()],
      };
      const options = setupOptions({ importHooks });
      const collectedObjects = [createObject()];
      mockCollectSavedObjects.mockResolvedValue({
        errors: [],
        collectedObjects,
        importStateMap: new Map(),
      });
      mockCreateSavedObjects.mockResolvedValueOnce({
        errors: [],
        createdObjects: collectedObjects,
      });

      await resolveSavedObjectsImportErrors(options);

      expect(mockExecuteImportHooks).toHaveBeenCalledWith({
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
      mockCollectSavedObjects.mockResolvedValue({
        errors: [],
        collectedObjects: [object],
        importStateMap: new Map(), // doesn't matter
      });
      // mockCheckReferenceOrigins returns an empty importStateMap by default

      await resolveSavedObjectsImportErrors(options);
      const objectWithReplacedReferences = {
        ...object,
        references: [{ ...object.references[0], id: 'def' }],
      };
      expect(mockValidateReferences).toHaveBeenCalledWith({
        objects: [objectWithReplacedReferences],
        savedObjectsClient,
        namespace,
        importStateMap: new Map(), // doesn't matter
        retries,
      });
    });

    test('checks conflicts', async () => {
      const createNewCopies = Symbol() as unknown as boolean;
      const retries = [createRetry()];
      const options = setupOptions({ retries, createNewCopies });
      const collectedObjects = [createObject()];
      mockCollectSavedObjects.mockResolvedValue({
        errors: [],
        collectedObjects,
        importStateMap: new Map(), // doesn't matter
      });

      await resolveSavedObjectsImportErrors(options);
      const checkConflictsParams = {
        objects: collectedObjects,
        savedObjectsClient,
        namespace,
        retries,
        createNewCopies,
      };
      expect(mockCheckConflicts).toHaveBeenCalledWith(checkConflictsParams);
    });

    test('checks origin conflicts', async () => {
      const retries = [createRetry()];
      const options = setupOptions({ retries });
      const filteredObjects = [createObject()];
      const importStateMap = new Map();
      const pendingOverwrites = new Set<string>();
      mockCheckConflicts.mockResolvedValue({
        errors: [],
        filteredObjects,
        importStateMap,
        pendingOverwrites,
      });

      await resolveSavedObjectsImportErrors(options);
      const checkOriginConflictsParams = {
        objects: filteredObjects,
        savedObjectsClient,
        typeRegistry,
        namespace,
        importStateMap,
        pendingOverwrites,
        retries,
      };
      expect(mockCheckOriginConflicts).toHaveBeenCalledWith(checkOriginConflictsParams);
    });

    test('gets import ID map for retries', async () => {
      const retries = [createRetry()];
      const createNewCopies = Symbol() as unknown as boolean;
      const options = setupOptions({ retries, createNewCopies });
      const filteredObjects = [createObject()];
      mockCheckConflicts.mockResolvedValue({
        errors: [],
        filteredObjects,
        importStateMap: new Map(),
        pendingOverwrites: new Set(),
      });

      await resolveSavedObjectsImportErrors(options);
      const getImportStateMapForRetriesParams = {
        objects: filteredObjects,
        retries,
        createNewCopies,
      };
      expect(mockGetImportStateMapForRetries).toHaveBeenCalledWith(
        getImportStateMapForRetriesParams
      );
    });

    test('splits objects to overwrite from those not to overwrite', async () => {
      const retries = [createRetry()];
      const options = setupOptions({ retries });
      const collectedObjects = [createObject()];
      mockCollectSavedObjects.mockResolvedValue({
        errors: [],
        collectedObjects,
        importStateMap: new Map(), // doesn't matter
      });

      await resolveSavedObjectsImportErrors(options);
      expect(mockSplitOverwrites).toHaveBeenCalledWith(collectedObjects, retries);
    });

    describe('with createNewCopies disabled', () => {
      test('does not regenerate object IDs', async () => {
        const options = setupOptions();
        const collectedObjects = [createObject()];
        mockCollectSavedObjects.mockResolvedValue({
          errors: [],
          collectedObjects,
          importStateMap: new Map(), // doesn't matter
        });

        await resolveSavedObjectsImportErrors(options);
        expect(mockRegenerateIds).not.toHaveBeenCalled();
      });

      test('creates saved objects', async () => {
        const options = setupOptions();
        const errors = [createError(), createError(), createError(), createError()];
        mockCollectSavedObjects.mockResolvedValue({
          errors: [errors[0]],
          collectedObjects: [], // doesn't matter
          importStateMap: new Map([
            ['a', {}],
            ['b', {}],
            ['c', {}],
            ['d', { isOnlyReference: true }],
          ]),
        });
        mockCheckReferenceOrigins.mockResolvedValue({
          importStateMap: new Map([['d', { isOnlyReference: true, destinationId: 'newId-d' }]]),
        });
        mockValidateReferences.mockResolvedValue([errors[1]]);
        mockCheckConflicts.mockResolvedValue({
          errors: [errors[2]],
          filteredObjects: [],
          importStateMap: new Map([
            ['b', { destinationId: 'newId-b2' }],
            ['c', { destinationId: 'newId-c2' }],
          ]),
          pendingOverwrites: new Set(),
        });
        mockCheckOriginConflicts.mockResolvedValue({
          errors: [errors[3]],
          importStateMap: new Map([['c', { destinationId: 'newId-c3' }]]),
          pendingOverwrites: new Set(),
        });
        mockGetImportStateMapForRetries.mockReturnValue(
          new Map([
            ['a', { destinationId: 'newId-a1' }],
            ['b', { destinationId: 'newId-b1' }],
            ['c', { destinationId: 'newId-c1' }],
          ])
        );

        // assert that the importStateMap is correctly composed of the results from the four modules
        const importStateMap = new Map([
          ['a', { destinationId: 'newId-a1' }],
          ['b', { destinationId: 'newId-b2' }],
          ['c', { destinationId: 'newId-c3' }],
          ['d', { isOnlyReference: true, destinationId: 'newId-d' }],
        ]);
        const objectsToOverwrite = [createObject()];
        const objectsToNotOverwrite = [createObject()];
        mockSplitOverwrites.mockReturnValue({ objectsToOverwrite, objectsToNotOverwrite });
        mockCreateSavedObjects.mockResolvedValueOnce({
          errors: [createError()], // this error will NOT be passed to the second `mockCreateSavedObjects` call
          createdObjects: [],
        });

        await resolveSavedObjectsImportErrors(options);
        const partialCreateSavedObjectsParams = {
          accumulatedErrors: errors,
          savedObjectsClient,
          importStateMap,
          namespace,
        };
        expect(mockCreateSavedObjects).toHaveBeenNthCalledWith(1, {
          ...partialCreateSavedObjectsParams,
          objects: objectsToOverwrite,
          overwrite: true,
        });
        expect(mockCreateSavedObjects).toHaveBeenNthCalledWith(2, {
          ...partialCreateSavedObjectsParams,
          objects: objectsToNotOverwrite,
        });
      });
    });

    describe('with createNewCopies enabled', () => {
      test('regenerates object IDs', async () => {
        const options = setupOptions({ createNewCopies: true });
        const collectedObjects = [createObject()];
        mockCollectSavedObjects.mockResolvedValue({
          errors: [],
          collectedObjects,
          importStateMap: new Map(), // doesn't matter
        });

        await resolveSavedObjectsImportErrors(options);
        expect(mockRegenerateIds).toHaveBeenCalledWith(collectedObjects);
      });

      test('does not check origin conflicts', async () => {
        const options = setupOptions({ createNewCopies: true });
        const collectedObjects = [createObject()];
        mockCollectSavedObjects.mockResolvedValue({
          errors: [],
          collectedObjects,
          importStateMap: new Map(), // doesn't matter
        });

        await resolveSavedObjectsImportErrors(options);
        expect(mockCheckOriginConflicts).not.toHaveBeenCalled();
      });

      test('creates saved objects', async () => {
        const options = setupOptions({ createNewCopies: true });
        const errors = [createError(), createError(), createError()];
        mockCollectSavedObjects.mockResolvedValue({
          errors: [errors[0]],
          collectedObjects: [], // doesn't matter
          importStateMap: new Map([
            ['a', {}],
            ['b', {}],
            ['c', {}],
            ['d', { isOnlyReference: true }],
          ]),
        });
        mockCheckReferenceOrigins.mockResolvedValue({
          importStateMap: new Map([['d', { isOnlyReference: true, destinationId: 'newId-d' }]]),
        });
        mockValidateReferences.mockResolvedValue([errors[1]]);
        mockRegenerateIds.mockReturnValue(
          new Map([
            ['a', { destinationId: 'randomId-a' }],
            ['b', { destinationId: 'randomId-b' }],
            ['c', { destinationId: 'randomId-c' }],
          ])
        );
        mockCheckConflicts.mockResolvedValue({
          errors: [errors[2]],
          filteredObjects: [],
          importStateMap: new Map([['c', { destinationId: 'newId-c2' }]]),
          pendingOverwrites: new Set(),
        });
        mockGetImportStateMapForRetries.mockReturnValue(
          new Map([
            ['b', { destinationId: 'newId-b1' }],
            ['c', { destinationId: 'newId-c1' }],
          ])
        );

        // assert that the importStateMap is correctly composed of the results from the five modules
        const importStateMap = new Map([
          ['a', { destinationId: 'randomId-a' }],
          ['b', { destinationId: 'newId-b1' }],
          ['c', { destinationId: 'newId-c2' }],
          ['d', { isOnlyReference: true, destinationId: 'newId-d' }],
        ]);
        const objectsToOverwrite = [createObject()];
        const objectsToNotOverwrite = [createObject()];
        mockSplitOverwrites.mockReturnValue({ objectsToOverwrite, objectsToNotOverwrite });
        mockCreateSavedObjects.mockResolvedValueOnce({
          errors: [createError()], // this error will NOT be passed to the second `mockCreateSavedObjects` call
          createdObjects: [],
        });

        await resolveSavedObjectsImportErrors(options);
        const partialCreateSavedObjectsParams = {
          accumulatedErrors: errors,
          savedObjectsClient,
          importStateMap,
          namespace,
        };
        expect(mockCreateSavedObjects).toHaveBeenNthCalledWith(1, {
          ...partialCreateSavedObjectsParams,
          objects: objectsToOverwrite,
          overwrite: true,
        });
        expect(mockCreateSavedObjects).toHaveBeenNthCalledWith(2, {
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
      mockCollectSavedObjects.mockResolvedValue({
        errors: [createError()],
        collectedObjects: [],
        importStateMap: new Map(), // doesn't matter
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
      mockCollectSavedObjects.mockResolvedValue({
        errors: [],
        collectedObjects,
        importStateMap: new Map(),
      });
      mockCreateSavedObjects.mockResolvedValueOnce({
        errors: [],
        createdObjects: collectedObjects,
      });
      const warnings: SavedObjectsImportWarning[] = [{ type: 'simple', message: 'foo' }];
      mockExecuteImportHooks.mockResolvedValue(warnings);

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
      mockCreateSavedObjects.mockResolvedValueOnce({
        errors: [error1],
        createdObjects: [obj1],
      });
      mockCreateSavedObjects.mockResolvedValueOnce({
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

      mockCheckConflicts.mockResolvedValue({
        errors: [],
        filteredObjects: [],
        importStateMap: new Map(),
        pendingOverwrites: new Set(),
      });
      mockCreateSavedObjects
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
      mockCollectSavedObjects.mockResolvedValue({
        errors: [errors[0]],
        collectedObjects: [],
        importStateMap: new Map(), // doesn't matter
      });
      mockValidateReferences.mockResolvedValue([errors[1]]);
      mockCreateSavedObjects.mockResolvedValueOnce({
        errors: [errors[2]],
        createdObjects: [],
      });
      mockCreateSavedObjects.mockResolvedValueOnce({
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
