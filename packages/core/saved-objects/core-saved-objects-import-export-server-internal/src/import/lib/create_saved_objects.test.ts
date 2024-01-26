/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import type { SavedObjectsImportFailure } from '@kbn/core-saved-objects-common';
import { type SavedObject, SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { createSavedObjects } from './create_saved_objects';
import { extractErrors } from './extract_errors';
import {
  LEGACY_URL_ALIAS_TYPE,
  LegacyUrlAlias,
} from '@kbn/core-saved-objects-base-server-internal';

type CreateSavedObjectsParams = Parameters<typeof createSavedObjects>[0];

interface CreateOptions {
  type: string;
  id: string;
  originId?: string;
  managed?: boolean;
}
/** Utility function to add default `managed` flag to objects that don't have one declared. */
const addManagedDefault = (objs: SavedObject[]) =>
  objs.map((obj) => ({ ...obj, managed: obj.managed ?? false }));
/**
 * Function to create a realistic-looking import object given a type, ID, and optional originId
 */
const createObject = (createOptions: CreateOptions): SavedObject => {
  const { type, id, originId, managed } = createOptions;
  return {
    type,
    id,
    attributes: {},
    references: [
      { name: 'name-1', type: 'other-type', id: 'other-id' }, // object that is not present
      { name: 'name-2', type: MULTI_NS_TYPE, id: 'id-1' }, // object that is present, but does not have an importStateMap entry
      { name: 'name-3', type: MULTI_NS_TYPE, id: 'id-3' }, // object that is present and has an importStateMap entry
    ],
    ...(originId && { originId }),
    ...(managed && { managed }),
  };
};

const createOptionsFrom = (type: string, id: string, originId?: string, managed?: boolean) => ({
  type,
  id,
  originId,
  managed,
});

const createLegacyUrlAliasObject = (
  sourceId: string,
  targetId: string,
  targetType: string,
  targetNamespace: string = 'default',
  managed?: boolean
): SavedObject<LegacyUrlAlias> => ({
  type: LEGACY_URL_ALIAS_TYPE,
  id: `${targetNamespace}:${targetType}:${sourceId}`,
  attributes: { sourceId, targetNamespace, targetType, targetId, purpose: 'savedObjectImport' },
  references: [],
  managed: managed ?? false,
});

const MULTI_NS_TYPE = 'multi';
const OTHER_TYPE = 'other';
/**
 * Create a variety of different objects to exercise different import / result scenarios
 */
const obj1 = createObject(createOptionsFrom(MULTI_NS_TYPE, 'id-1', 'originId-a', true)); // -> success
const obj2 = createObject(createOptionsFrom(MULTI_NS_TYPE, 'id-2', 'originId-b')); // -> conflict
const obj3 = createObject(createOptionsFrom(MULTI_NS_TYPE, 'id-3', 'originId-c')); // -> conflict (with known importId and omitOriginId=true)
const obj4 = createObject(createOptionsFrom(MULTI_NS_TYPE, 'id-4', 'originId-d')); // -> conflict (with known importId)
const obj5 = createObject(createOptionsFrom(MULTI_NS_TYPE, 'id-5', 'originId-e')); // -> unresolvable conflict
const obj6 = createObject(createOptionsFrom(MULTI_NS_TYPE, 'id-6', undefined, true)); // -> success
const obj7 = createObject(createOptionsFrom(MULTI_NS_TYPE, 'id-7')); // -> conflict
const obj8 = createObject(createOptionsFrom(MULTI_NS_TYPE, 'id-8')); // -> conflict (with known importId)
const obj9 = createObject(createOptionsFrom(MULTI_NS_TYPE, 'id-9')); // -> unresolvable conflict
const obj10 = createObject(createOptionsFrom(OTHER_TYPE, 'id-10', 'originId-f')); // -> success
const obj11 = createObject(createOptionsFrom(OTHER_TYPE, 'id-11', 'originId-g')); // -> conflict
const obj12 = createObject(createOptionsFrom(OTHER_TYPE, 'id-12')); // -> success
const obj13 = createObject(createOptionsFrom(OTHER_TYPE, 'id-13')); // -> conflict
// non-multi-namespace types shouldn't have origin IDs, but we include test cases to ensure it's handled gracefully
// non-multi-namespace types by definition cannot result in an unresolvable conflict, so we don't include test cases for those
const importId3 = 'id-foo';
const importId4 = 'id-bar';
const importId8 = 'id-baz';
const importStateMap = new Map([
  [`${obj3.type}:${obj3.id}`, { destinationId: importId3, omitOriginId: true }],
  [`${obj4.type}:${obj4.id}`, { destinationId: importId4, managed: true }],
  [`${obj8.type}:${obj8.id}`, { destinationId: importId8 }],
]);

const legacyUrlAliasForObj1 = createLegacyUrlAliasObject(obj1.originId!, obj1.id, obj1.type);
const legacyUrlAliasForObj10 = createLegacyUrlAliasObject(obj10.originId!, obj10.id, obj10.type);

describe('#createSavedObjects', () => {
  let savedObjectsClient: jest.Mocked<SavedObjectsClientContract>;
  let bulkCreate: typeof savedObjectsClient['bulkCreate'];

  /**
   * Creates an options object to be used as an argument for createSavedObjects
   * Includes mock savedObjectsClient
   */
  const setupParams = (partial: {
    objects: SavedObject[];
    accumulatedErrors?: SavedObjectsImportFailure[];
    namespace?: string;
    overwrite?: boolean;
    compatibilityMode?: boolean;
    managed?: boolean;
  }): CreateSavedObjectsParams => {
    savedObjectsClient = savedObjectsClientMock.create();
    bulkCreate = savedObjectsClient.bulkCreate;
    return { accumulatedErrors: [], ...partial, savedObjectsClient, importStateMap };
  };

  const getExpectedBulkCreateArgsObjects = (objects: SavedObject[], retry?: boolean) =>
    objects.map(({ type, id, attributes, originId, managed }) => ({
      type,
      id: retry ? `new-id-for-${id}` : id, // if this was a retry, we regenerated the id -- this is mocked below
      attributes,
      references: [
        { name: 'name-1', type: 'other-type', id: 'other-id' }, // object that is not present
        { name: 'name-2', type: MULTI_NS_TYPE, id: 'id-1' }, // object that is present, but does not have an importStateMap entry
        { name: 'name-3', type: MULTI_NS_TYPE, id: 'id-foo' }, // object that is present and has an importStateMap entry
      ],
      // if the import object had an originId, and/or if we regenerated the id, expect an originId to be included in the create args
      ...((originId || retry) && { originId: originId || id }),
      ...(managed && { managed }),
    }));

  const expectBulkCreateArgs = {
    objects: (n: number, objects: SavedObject[], retry?: boolean) => {
      const expectedObjects = getExpectedBulkCreateArgsObjects(objects, retry);
      const expectedOptions = expect.any(Object);
      const expectedObjectsWithManagedDefault = addManagedDefault(expectedObjects);
      expect(bulkCreate).toHaveBeenNthCalledWith(
        n,
        expectedObjectsWithManagedDefault,
        expectedOptions
      );
    },
    legacyUrlAliases: (n: number, expectedAliasObjects: SavedObject[]) => {
      const expectedOptions = expect.any(Object);
      expect(bulkCreate).toHaveBeenNthCalledWith(n, expectedAliasObjects, expectedOptions);
    },
    options: (n: number, options: CreateSavedObjectsParams) => {
      const expectedObjects = expect.any(Array);
      const expectedOptions = { namespace: options.namespace, overwrite: options.overwrite };
      expect(bulkCreate).toHaveBeenNthCalledWith(n, expectedObjects, expectedOptions);
    },
  };

  const getResultMock = {
    success: (
      { type, id, attributes, references, originId, managed: objectManaged }: SavedObject,
      { namespace, managed }: CreateSavedObjectsParams
    ): SavedObject => ({
      type,
      id,
      attributes,
      references,
      ...(originId && { originId }),
      ...((managed && { managed }) ??
        (objectManaged && { managed: objectManaged }) ?? { managed: false }),
      version: 'some-version',
      updated_at: 'some-date',
      namespaces: [namespace ?? 'default'],
    }),
    conflict: (type: string, id: string) => {
      const error = SavedObjectsErrorHelpers.createConflictError(type, id).output.payload;
      return { type, id, error } as unknown as SavedObject;
    },
    unresolvableConflict: (type: string, id: string) => {
      const conflictMock = getResultMock.conflict(type, id);
      conflictMock.error!.metadata = { isNotOverwritable: true };
      return conflictMock;
    },
  };

  /**
   * Remap the bulkCreate results to ensure that each returned object reflects the ID of the imported object.
   * This is needed because createSavedObjects may change the ID of the object to create, but this process is opaque to consumers of the
   * API; we have to remap IDs of results so consumers can act upon them, as there is no guarantee that results will be returned in the same
   * order as they were imported in.
   * For the purposes of this test suite, the objects ARE guaranteed to be in the same order, so we do a simple loop to remap the IDs.
   * In addition, extract the errors out of the created objects -- since we are testing with realistic objects/errors, we can use the real
   * `extractErrors` module to do so.
   */
  const getExpectedResults = (resultObjects: SavedObject[], objects: SavedObject[]) => {
    const remappedResults = resultObjects.map((result, i) => ({ ...result, id: objects[i].id }));
    return {
      createdObjects: remappedResults.filter((obj) => !obj.error),
      errors: extractErrors(remappedResults, objects, [], new Map()),
    };
  };

  test('filters out objects that have errors present', async () => {
    const error = { type: obj1.type, id: obj1.id } as SavedObjectsImportFailure;
    const options = setupParams({ objects: [obj1], accumulatedErrors: [error] });

    const createSavedObjectsResult = await createSavedObjects(options);
    expect(bulkCreate).not.toHaveBeenCalled();
    expect(createSavedObjectsResult).toEqual({ createdObjects: [], errors: [] });
  });

  test('exits early if there are no objects to create', async () => {
    const options = setupParams({ objects: [] });

    const createSavedObjectsResult = await createSavedObjects(options);
    expect(bulkCreate).not.toHaveBeenCalled();
    expect(createSavedObjectsResult).toEqual({ createdObjects: [], errors: [] });
  });

  const objs = [obj1, obj2, obj3, obj4, obj5, obj6, obj7, obj8, obj9, obj10, obj11, obj12, obj13];

  const setupMockResults = (options: CreateSavedObjectsParams) => {
    bulkCreate.mockResolvedValue({
      saved_objects: [
        getResultMock.success(obj1, options),
        getResultMock.conflict(obj2.type, obj2.id),
        getResultMock.conflict(obj3.type, importId3),
        getResultMock.conflict(obj4.type, importId4),
        getResultMock.unresolvableConflict(obj5.type, obj5.id),
        getResultMock.success(obj6, options),
        getResultMock.conflict(obj7.type, obj7.id),
        getResultMock.conflict(obj8.type, importId8),
        getResultMock.unresolvableConflict(obj9.type, obj9.id),
        getResultMock.success(obj10, options),
        getResultMock.conflict(obj11.type, obj11.id),
        getResultMock.success(obj12, options),
        getResultMock.conflict(obj13.type, obj13.id),
      ],
    });
  };

  describe('handles accumulated errors as expected', () => {
    const resolvableErrors: SavedObjectsImportFailure[] = [
      { type: 'foo', id: 'foo-id', error: { type: 'conflict' } } as SavedObjectsImportFailure,
      {
        type: 'bar',
        id: 'bar-id',
        error: { type: 'ambiguous_conflict' },
      } as SavedObjectsImportFailure,
      {
        type: 'baz',
        id: 'baz-id',
        error: { type: 'missing_references' },
      } as SavedObjectsImportFailure,
    ];
    const unresolvableErrors: SavedObjectsImportFailure[] = [
      {
        type: 'qux',
        id: 'qux-id',
        error: { type: 'unsupported_type' },
      } as SavedObjectsImportFailure,
      { type: 'quux', id: 'quux-id', error: { type: 'unknown' } } as SavedObjectsImportFailure,
    ];

    test('does not call bulkCreate when resolvable errors are present', async () => {
      for (const error of resolvableErrors) {
        const options = setupParams({ objects: objs, accumulatedErrors: [error] });
        await createSavedObjects(options);
        expect(bulkCreate).not.toHaveBeenCalled();
      }
    });

    test('when in compatibility mode, does not call bulkCreate when resolvable errors are present', async () => {
      for (const error of resolvableErrors) {
        const options = setupParams({
          objects: objs,
          accumulatedErrors: [error],
          compatibilityMode: true,
        });
        await createSavedObjects(options);
        expect(bulkCreate).not.toHaveBeenCalled();
      }
    });

    test('calls bulkCreate when unresolvable errors or no errors are present with docs that have managed set', async () => {
      for (const error of unresolvableErrors) {
        const options = setupParams({ objects: objs, accumulatedErrors: [error] });
        setupMockResults(options);
        await createSavedObjects(options);
        expect(bulkCreate).toHaveBeenCalledTimes(1);
        bulkCreate.mockClear();
      }
      const options = setupParams({ objects: objs });
      setupMockResults(options);
      await createSavedObjects(options);
      expect(bulkCreate).toHaveBeenCalledTimes(1);
    });

    test('when in compatibility mode, calls bulkCreate for legacy URL aliases when unresolvable errors or no errors are present', async () => {
      for (const error of unresolvableErrors) {
        // options are ok, they return objects as declared
        const options = setupParams({
          objects: objs,
          accumulatedErrors: [error],
          compatibilityMode: true,
        });
        setupMockResults(options);
        await createSavedObjects(options);
        expect(bulkCreate).toHaveBeenCalledTimes(2);
        expectBulkCreateArgs.legacyUrlAliases(2, [legacyUrlAliasForObj1, legacyUrlAliasForObj10]);
        bulkCreate.mockClear();
      }
      const options = setupParams({ objects: objs, compatibilityMode: true });
      setupMockResults(options);
      await createSavedObjects(options);
      expect(bulkCreate).toHaveBeenCalledTimes(2);
      expectBulkCreateArgs.legacyUrlAliases(2, [legacyUrlAliasForObj1, legacyUrlAliasForObj10]);
    });
  });

  it('filters out version from objects before create and accepts managed', async () => {
    const options = setupParams({ objects: [{ ...obj1, version: 'foo' }] }); // here optionsManaged is undefined
    bulkCreate.mockResolvedValue({ saved_objects: [getResultMock.success(obj1, options)] });

    await createSavedObjects(options);
    expectBulkCreateArgs.objects(1, [obj1]);
  });

  const testBulkCreateObjects = async ({
    namespace,
    compatibilityMode,
    managed,
  }: { namespace?: string; compatibilityMode?: boolean; managed?: boolean } = {}) => {
    const objsWithMissingManaged = addManagedDefault(objs);
    const options = setupParams({
      objects: objsWithMissingManaged,
      namespace,
      compatibilityMode,
      managed,
    });
    setupMockResults(options);

    await createSavedObjects(options);
    expect(bulkCreate).toHaveBeenCalledTimes(compatibilityMode ? 2 : 1);
    // these three objects are transformed before being created, because they are included in the `importStateMap`
    const x3 = { ...obj3, id: importId3, originId: undefined }; // this import object already has an originId, but the entry has omitOriginId=true
    const x4 = { ...obj4, id: importId4 }; // this import object already has an originId
    const x8 = { ...obj8, id: importId8, originId: obj8.id }; // this import object doesn't have an originId, so it is set before create
    const argObjs = [obj1, obj2, x3, x4, obj5, obj6, obj7, x8, obj9, obj10, obj11, obj12, obj13];
    const argObjsWithMissingManaged = addManagedDefault(argObjs);
    expectBulkCreateArgs.objects(1, argObjsWithMissingManaged);

    if (compatibilityMode) {
      // Rewrite namespace in the legacy URL alias.
      const argLegacyUrlAliasObjs = namespace
        ? [legacyUrlAliasForObj1, legacyUrlAliasForObj10].map((legacyUrlAlias) =>
            createLegacyUrlAliasObject(
              legacyUrlAlias.attributes.sourceId,
              legacyUrlAlias.attributes.targetId,
              legacyUrlAlias.attributes.targetType,
              namespace
            )
          )
        : [legacyUrlAliasForObj1, legacyUrlAliasForObj10];
      expectBulkCreateArgs.legacyUrlAliases(2, argLegacyUrlAliasObjs);
    }
  };
  const testBulkCreateOptions = async ({
    namespace,
    compatibilityMode,
  }: { namespace?: string; compatibilityMode?: boolean } = {}) => {
    const overwrite = Symbol() as unknown as boolean;
    const options = setupParams({ objects: objs, namespace, overwrite, compatibilityMode });
    setupMockResults(options);

    await createSavedObjects(options);
    expect(bulkCreate).toHaveBeenCalledTimes(compatibilityMode ? 2 : 1);
    expectBulkCreateArgs.options(1, options);
    if (compatibilityMode) {
      expectBulkCreateArgs.options(2, options);
    }
  };
  const testReturnValue = async ({
    namespace,
    compatibilityMode,
  }: { namespace?: string; compatibilityMode?: boolean } = {}) => {
    const options = setupParams({ objects: objs, namespace, compatibilityMode });
    setupMockResults(options);

    const results = await createSavedObjects(options);
    const resultSavedObjects = (await bulkCreate.mock.results[0].value).saved_objects;
    const [r1, r2, r3, r4, r5, r6, r7, r8, r9, r10, r11, r12, r13] = resultSavedObjects;
    // these three results are transformed before being returned, because the bulkCreate attempt used different IDs for them
    const [x3, x4, x8] = [r3, r4, r8].map((x: SavedObject) => ({ ...x, destinationId: x.id }));
    const transformedResults = [r1, r2, x3, x4, r5, r6, r7, x8, r9, r10, r11, r12, r13];
    const expectedResults = getExpectedResults(transformedResults, objs);
    expect(results).toEqual(expectedResults);
  };

  describe('with an undefined namespace', () => {
    test('calls bulkCreate according to input objects and compatibilityMode option', async () => {
      await testBulkCreateObjects();
      await testBulkCreateObjects({ compatibilityMode: true });
    });
    test('calls bulkCreate once with input options', async () => {
      await testBulkCreateOptions();
      await testBulkCreateOptions({ compatibilityMode: true });
    });
    test('returns bulkCreate results that are remapped to IDs of imported objects', async () => {
      await testReturnValue();
      await testReturnValue({ compatibilityMode: true });
    });
  });

  describe('with a defined namespace', () => {
    const namespace = 'some-namespace';
    test('calls bulkCreate according to input objects and compatibilityMode option', async () => {
      await testBulkCreateObjects({ namespace });
      await testBulkCreateObjects({ namespace, compatibilityMode: true });
    });
    test('calls bulkCreate once with input options', async () => {
      await testBulkCreateOptions({ namespace });
      await testBulkCreateOptions({ namespace, compatibilityMode: true });
    });
    test('returns bulkCreate results that are remapped to IDs of imported objects', async () => {
      await testReturnValue({ namespace });
      await testReturnValue({ namespace, compatibilityMode: true });
    });
  });
});
