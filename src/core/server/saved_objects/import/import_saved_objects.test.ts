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
} from '../types';
import { savedObjectsClientMock } from '../../mocks';
import { ISavedObjectTypeRegistry } from '..';
import { typeRegistryMock } from '../saved_objects_type_registry.mock';
import { importSavedObjectsFromStream, ImportSavedObjectsOptions } from './import_saved_objects';
import { SavedObjectsImportHook, SavedObjectsImportWarning } from './types';

import {
  collectSavedObjects,
  regenerateIds,
  validateReferences,
  checkConflicts,
  checkOriginConflicts,
  createSavedObjects,
  executeImportHooks,
} from './lib';

jest.mock('./lib/collect_saved_objects');
jest.mock('./lib/regenerate_ids');
jest.mock('./lib/validate_references');
jest.mock('./lib/check_conflicts');
jest.mock('./lib/check_origin_conflicts');
jest.mock('./lib/create_saved_objects');
jest.mock('./lib/execute_import_hooks');

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
    getMockFn(executeImportHooks).mockResolvedValue([]);
  });

  let readStream: Readable;
  const objectLimit = 10;
  const overwrite = Symbol() as unknown as boolean;
  let savedObjectsClient: jest.Mocked<SavedObjectsClientContract>;
  let typeRegistry: jest.Mocked<ISavedObjectTypeRegistry>;
  const namespace = 'some-namespace';

  const setupOptions = ({
    createNewCopies = false,
    getTypeImpl = (type: string) =>
      ({
        // other attributes aren't needed for the purposes of injecting metadata
        management: { icon: `${type}-icon` },
      } as any),
    importHooks = {},
  }: {
    createNewCopies?: boolean;
    getTypeImpl?: (name: string) => any;
    importHooks?: Record<string, SavedObjectsImportHook[]>;
  } = {}): ImportSavedObjectsOptions => {
    readStream = new Readable();
    savedObjectsClient = savedObjectsClientMock.create();
    typeRegistry = typeRegistryMock.create();
    typeRegistry.getType.mockImplementation(getTypeImpl);
    return {
      readStream,
      objectLimit,
      overwrite,
      savedObjectsClient,
      typeRegistry,
      namespace,
      createNewCopies,
      importHooks,
    };
  };
  const createObject = ({
    type = 'foo-type',
    title = 'some-title',
  }: { type?: string; title?: string } = {}): SavedObject<{
    title: string;
  }> => {
    return {
      type,
      id: uuidv4(),
      references: [],
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

    test('executes import hooks', async () => {
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
      getMockFn(createSavedObjects).mockResolvedValue({
        errors: [],
        createdObjects: collectedObjects,
      });

      await importSavedObjectsFromStream(options);

      expect(executeImportHooks).toHaveBeenCalledWith({
        objects: collectedObjects,
        importHooks,
      });
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
        const options = setupOptions({ createNewCopies: true });
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
        const options = setupOptions({ createNewCopies: true });
        getMockFn(validateReferences).mockResolvedValue([]);

        await importSavedObjectsFromStream(options);
        expect(checkConflicts).not.toHaveBeenCalled();
        expect(checkOriginConflicts).not.toHaveBeenCalled();
      });

      test('creates saved objects', async () => {
        const options = setupOptions({ createNewCopies: true });
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
      expect(result).toEqual({ success: true, successCount: 0, warnings: [] });
    });

    test('returns success=false if an error occurred', async () => {
      const options = setupOptions();
      getMockFn(collectSavedObjects).mockResolvedValue({
        errors: [createError()],
        collectedObjects: [],
        importIdMap: new Map(), // doesn't matter
      });

      const result = await importSavedObjectsFromStream(options);
      expect(result).toEqual({
        success: false,
        successCount: 0,
        errors: [expect.any(Object)],
        warnings: [],
      });
    });

    test('returns warnings from the import hooks', async () => {
      const options = setupOptions();
      const collectedObjects = [createObject()];
      getMockFn(collectSavedObjects).mockResolvedValue({
        errors: [],
        collectedObjects,
        importIdMap: new Map(),
      });
      getMockFn(createSavedObjects).mockResolvedValue({
        errors: [],
        createdObjects: collectedObjects,
      });

      const warnings: SavedObjectsImportWarning[] = [{ type: 'simple', message: 'foo' }];
      getMockFn(executeImportHooks).mockResolvedValue(warnings);

      const result = await importSavedObjectsFromStream(options);

      expect(result.warnings).toEqual(warnings);
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
          warnings: [],
        });
      });

      test('with createNewCopies enabled', async () => {
        // however, we include it here for posterity
        const options = setupOptions({ createNewCopies: true });
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
          warnings: [],
        });
      });
    });

    test('uses `type.management.getTitle` to resolve the titles', async () => {
      const obj1 = createObject({ type: 'foo' });
      const obj2 = createObject({ type: 'bar', title: 'bar-title' });

      const options = setupOptions({
        createNewCopies: false,
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
      getMockFn(createSavedObjects).mockResolvedValue({ errors: [], createdObjects: [obj1, obj2] });

      const result = await importSavedObjectsFromStream(options);
      // successResults only includes the imported object's type, id, and destinationId (if a new one was generated)
      const successResults = [
        {
          type: obj1.type,
          id: obj1.id,
          meta: { title: 'getTitle-foo', icon: `${obj1.type}-icon` },
        },
        {
          type: obj2.type,
          id: obj2.id,
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
      expect(result).toEqual({
        success: false,
        successCount: 0,
        errors: expectedErrors,
        warnings: [],
      });
    });
  });
});
