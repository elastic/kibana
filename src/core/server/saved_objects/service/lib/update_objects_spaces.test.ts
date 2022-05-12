/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  mockGetBulkOperationError,
  mockGetExpectedVersionProperties,
  mockRawDocExistsInNamespace,
  mockDeleteLegacyUrlAliases,
} from './update_objects_spaces.test.mock';

import { elasticsearchClientMock } from '../../../elasticsearch/client/mocks';

import { loggerMock } from '../../../logging/logger.mock';
import { typeRegistryMock } from '../../saved_objects_type_registry.mock';
import { SavedObjectsSerializer } from '../../serialization';
import type {
  SavedObjectsUpdateObjectsSpacesObject,
  UpdateObjectsSpacesParams,
} from './update_objects_spaces';
import { updateObjectsSpaces } from './update_objects_spaces';
import { ALL_NAMESPACES_STRING } from './utils';
import { SavedObjectsErrorHelpers } from './errors';

type SetupParams = Partial<
  Pick<UpdateObjectsSpacesParams, 'objects' | 'spacesToAdd' | 'spacesToRemove' | 'options'>
>;

const EXISTING_SPACE = 'existing-space';
const VERSION_PROPS = { _seq_no: 1, _primary_term: 1 };
const EXPECTED_VERSION_PROPS = { if_seq_no: 1, if_primary_term: 1 };
const BULK_ERROR = {
  error: 'Oh no, a bulk error!',
  type: 'error_type',
  message: 'error_message',
  statusCode: 400,
};

const SHAREABLE_OBJ_TYPE = 'type-a';
const NON_SHAREABLE_OBJ_TYPE = 'type-b';
const SHAREABLE_HIDDEN_OBJ_TYPE = 'type-c';

const mockCurrentTime = new Date('2021-05-01T10:20:30Z');

beforeAll(() => {
  jest.useFakeTimers('modern');
  jest.setSystemTime(mockCurrentTime);
});

beforeEach(() => {
  mockGetExpectedVersionProperties.mockReturnValue(EXPECTED_VERSION_PROPS);
  mockRawDocExistsInNamespace.mockReset();
  mockRawDocExistsInNamespace.mockReturnValue(true); // return true by default
  mockDeleteLegacyUrlAliases.mockReset();
  mockDeleteLegacyUrlAliases.mockResolvedValue(); // resolve an empty promise by default
});

afterAll(() => {
  jest.useRealTimers();
});

describe('#updateObjectsSpaces', () => {
  let client: ReturnType<typeof elasticsearchClientMock.createElasticsearchClient>;

  /** Sets up the type registry, saved objects client, etc. and return the full parameters object to be passed to `updateObjectsSpaces` */
  function setup({ objects = [], spacesToAdd = [], spacesToRemove = [], options }: SetupParams) {
    const registry = typeRegistryMock.create();
    registry.isShareable.mockImplementation(
      (type) => [SHAREABLE_OBJ_TYPE, SHAREABLE_HIDDEN_OBJ_TYPE].includes(type) // NON_SHAREABLE_OBJ_TYPE is excluded
    );
    client = elasticsearchClientMock.createElasticsearchClient();
    const serializer = new SavedObjectsSerializer(registry);
    return {
      mappings: { properties: {} }, // doesn't matter, only used as an argument to deleteLegacyUrlAliases which is mocked
      registry,
      allowedTypes: [SHAREABLE_OBJ_TYPE, NON_SHAREABLE_OBJ_TYPE], // SHAREABLE_HIDDEN_OBJ_TYPE is excluded
      client,
      serializer,
      logger: loggerMock.create(),
      getIndexForType: (type: string) => `index-for-${type}`,
      objects,
      spacesToAdd,
      spacesToRemove,
      options,
    };
  }

  /** Mocks the saved objects client so it returns the expected results */
  function mockMgetResults(...results: Array<{ found: boolean }>) {
    client.mget.mockResponseOnce({
      docs: results.map((x) =>
        x.found
          ? {
              _id: 'doesnt-matter',
              _index: 'doesnt-matter',
              _source: { namespaces: [EXISTING_SPACE] },
              ...VERSION_PROPS,
              found: true,
            }
          : {
              _id: 'doesnt-matter',
              _index: 'doesnt-matter',
              found: false,
            }
      ),
    });
  }

  /** Mocks the saved objects client so as to test unsupported server responding with 404 */
  function mockMgetResultsNotFound(...results: Array<{ found: boolean }>) {
    client.mget.mockResponseOnce(
      {
        docs: results.map((x) =>
          x.found
            ? {
                _id: 'doesnt-matter',
                _index: 'doesnt-matter',
                _source: { namespaces: [EXISTING_SPACE] },
                ...VERSION_PROPS,
                found: true,
              }
            : {
                _id: 'doesnt-matter',
                _index: 'doesnt-matter',
                found: false,
              }
        ),
      },
      { statusCode: 404, headers: {} }
    );
  }

  /** Asserts that mget is called for the given objects */
  function expectMgetArgs(...objects: SavedObjectsUpdateObjectsSpacesObject[]) {
    const docs = objects.map(({ type, id }) => expect.objectContaining({ _id: `${type}:${id}` }));
    expect(client.mget).toHaveBeenCalledWith({ body: { docs } }, expect.anything());
  }

  /** Mocks the saved objects client so it returns the expected results */
  function mockBulkResults(...results: Array<{ error: boolean }>) {
    results.forEach(({ error }) => {
      if (error) {
        mockGetBulkOperationError.mockReturnValueOnce(BULK_ERROR);
      } else {
        mockGetBulkOperationError.mockReturnValueOnce(undefined);
      }
    });
    client.bulk.mockResponseOnce({
      items: results.map(() => ({})), // as long as the result does not contain an error field, it is treated as a success
      errors: false,
      took: 0,
    });
  }

  /** Asserts that mget is called for the given objects */
  function expectBulkArgs(
    ...objectActions: Array<{
      object: { type: string; id: string; namespaces?: string[] };
      action: 'update' | 'delete';
    }>
  ) {
    const body = objectActions.flatMap(
      ({ object: { type, id, namespaces = expect.any(Array) }, action }) => {
        const operation = {
          [action]: {
            _id: `${type}:${id}`,
            _index: `index-for-${type}`,
            ...EXPECTED_VERSION_PROPS,
          },
        };
        return action === 'update'
          ? [operation, { doc: { namespaces, updated_at: mockCurrentTime.toISOString() } }] // 'update' uses an operation and document metadata
          : [operation]; // 'delete' only uses an operation
      }
    );
    expect(client.bulk).toHaveBeenCalledWith(expect.objectContaining({ body }));
  }

  beforeEach(() => {
    mockGetBulkOperationError.mockReset(); // reset calls and return undefined by default
  });

  describe('errors', () => {
    it('throws when spacesToAdd and spacesToRemove are empty', async () => {
      const objects = [{ type: SHAREABLE_OBJ_TYPE, id: 'id-1' }];
      const params = setup({ objects });

      await expect(() => updateObjectsSpaces(params)).rejects.toThrow(
        'spacesToAdd and/or spacesToRemove must be a non-empty array of strings: Bad Request'
      );
    });

    it('throws when spacesToAdd and spacesToRemove intersect', async () => {
      const objects = [{ type: SHAREABLE_OBJ_TYPE, id: 'id-1' }];
      const spacesToAdd = ['foo-space', 'bar-space'];
      const spacesToRemove = ['bar-space', 'baz-space'];
      const params = setup({ objects, spacesToAdd, spacesToRemove });

      await expect(() => updateObjectsSpaces(params)).rejects.toThrow(
        'spacesToAdd and spacesToRemove cannot contain any of the same strings: Bad Request'
      );
    });

    it('throws when mget cluster call fails', async () => {
      const objects = [{ type: SHAREABLE_OBJ_TYPE, id: 'id-1' }];
      const spacesToAdd = ['foo-space'];
      const params = setup({ objects, spacesToAdd });
      client.mget.mockReturnValueOnce(
        elasticsearchClientMock.createErrorTransportRequestPromise(new Error('mget error'))
      );

      await expect(() => updateObjectsSpaces(params)).rejects.toThrow('mget error');
    });

    it('throws when bulk cluster call fails', async () => {
      const objects = [{ type: SHAREABLE_OBJ_TYPE, id: 'id-1' }];
      const spacesToAdd = ['foo-space'];
      const params = setup({ objects, spacesToAdd });
      mockMgetResults({ found: true });
      client.bulk.mockReturnValueOnce(
        elasticsearchClientMock.createErrorTransportRequestPromise(new Error('bulk error'))
      );

      await expect(() => updateObjectsSpaces(params)).rejects.toThrow('bulk error');
    });

    it('returns mix of type errors, mget/bulk cluster errors, and successes', async () => {
      const obj1 = { type: SHAREABLE_HIDDEN_OBJ_TYPE, id: 'id-1' }; // invalid type (Not Found)
      const obj2 = { type: NON_SHAREABLE_OBJ_TYPE, id: 'id-2' }; // non-shareable type (Bad Request)
      // obj3 below is mocking an example where a SOC wrapper attempted to retrieve it in a pre-flight request but it was not found.
      // Since it has 'spaces: []', that indicates it should be skipped for cluster calls and just returned as a Not Found error.
      // Realistically this would not be intermingled with other requested objects that do not have 'spaces' arrays, but it's fine for this
      // specific test case.
      const obj3 = { type: SHAREABLE_OBJ_TYPE, id: 'id-3', spaces: [] }; // does not exist (Not Found)
      const obj4 = { type: SHAREABLE_OBJ_TYPE, id: 'id-4' }; // mget error (found but doesn't exist in the current space)
      const obj5 = { type: SHAREABLE_OBJ_TYPE, id: 'id-5' }; // mget error (Not Found)
      const obj6 = { type: SHAREABLE_OBJ_TYPE, id: 'id-6' }; // bulk error (mocked as BULK_ERROR)
      const obj7 = { type: SHAREABLE_OBJ_TYPE, id: 'id-7' }; // success

      const objects = [obj1, obj2, obj3, obj4, obj5, obj6, obj7];
      const spacesToAdd = ['foo-space'];
      const params = setup({ objects, spacesToAdd });
      mockMgetResults({ found: true }, { found: false }, { found: true }, { found: true }); // results for obj4, obj5, obj6, and obj7
      mockRawDocExistsInNamespace.mockReturnValueOnce(false); // for obj4
      mockRawDocExistsInNamespace.mockReturnValueOnce(true); // for obj6
      mockRawDocExistsInNamespace.mockReturnValueOnce(true); // for obj7
      mockBulkResults({ error: true }, { error: false }); // results for obj6 and obj7

      const result = await updateObjectsSpaces(params);
      expect(client.mget).toHaveBeenCalledTimes(1);
      expectMgetArgs(obj4, obj5, obj6, obj7);
      expect(mockRawDocExistsInNamespace).toHaveBeenCalledTimes(3);
      expect(client.bulk).toHaveBeenCalledTimes(1);
      expectBulkArgs({ action: 'update', object: obj6 }, { action: 'update', object: obj7 });
      expect(result.objects).toEqual([
        { ...obj1, spaces: [], error: expect.objectContaining({ error: 'Not Found' }) },
        { ...obj2, spaces: [], error: expect.objectContaining({ error: 'Bad Request' }) },
        { ...obj3, spaces: [], error: expect.objectContaining({ error: 'Not Found' }) },
        { ...obj4, spaces: [], error: expect.objectContaining({ error: 'Not Found' }) },
        { ...obj5, spaces: [], error: expect.objectContaining({ error: 'Not Found' }) },
        { ...obj6, spaces: [], error: BULK_ERROR },
        { ...obj7, spaces: [EXISTING_SPACE, 'foo-space'] },
      ]);
    });

    it('throws when mget not found response is missing the Elasticsearch header', async () => {
      const objects = [{ type: SHAREABLE_OBJ_TYPE, id: 'id-1' }];
      const spacesToAdd = ['foo-space'];
      const params = setup({ objects, spacesToAdd });
      mockMgetResultsNotFound({ found: true });

      await expect(() => updateObjectsSpaces(params)).rejects.toThrowError(
        SavedObjectsErrorHelpers.createGenericNotFoundEsUnavailableError()
      );
    });
  });

  // Note: these test cases do not include requested objects that will result in errors (those are covered above)
  describe('cluster and module calls', () => {
    it('mget call skips objects that have "spaces" defined', async () => {
      const obj1 = { type: SHAREABLE_OBJ_TYPE, id: 'id-1', spaces: [EXISTING_SPACE] }; // will not be retrieved
      const obj2 = { type: SHAREABLE_OBJ_TYPE, id: 'id-2' }; // will be passed to mget

      const objects = [obj1, obj2];
      const spacesToAdd = ['foo-space'];
      const params = setup({ objects, spacesToAdd });
      mockMgetResults({ found: true }); // result for obj2
      mockBulkResults({ error: false }, { error: false }); // results for obj1 and obj2

      await updateObjectsSpaces(params);
      expect(client.mget).toHaveBeenCalledTimes(1);
      expectMgetArgs(obj2);
    });

    it('does not call mget if all objects have "spaces" defined', async () => {
      const obj1 = { type: SHAREABLE_OBJ_TYPE, id: 'id-1', spaces: [EXISTING_SPACE] }; // will not be retrieved

      const objects = [obj1];
      const spacesToAdd = ['foo-space'];
      const params = setup({ objects, spacesToAdd });
      mockBulkResults({ error: false }); // result for obj1

      await updateObjectsSpaces(params);
      expect(client.mget).not.toHaveBeenCalled();
    });

    describe('bulk call skips objects that will not be changed', () => {
      it('when adding spaces', async () => {
        const space1 = 'space-to-add';
        const space2 = 'other-space';
        const obj1 = { type: SHAREABLE_OBJ_TYPE, id: 'id-1', spaces: [space1] }; // will not be changed
        const obj2 = { type: SHAREABLE_OBJ_TYPE, id: 'id-2', spaces: [space2] }; // will be updated

        const objects = [obj1, obj2];
        const spacesToAdd = [space1];
        const params = setup({ objects, spacesToAdd });
        // this test case does not call mget
        mockBulkResults({ error: false }); // result for obj2

        await updateObjectsSpaces(params);
        expect(client.bulk).toHaveBeenCalledTimes(1);
        expectBulkArgs({
          action: 'update',
          object: { ...obj2, namespaces: [space2, space1] },
        });
      });

      it('when removing spaces', async () => {
        const space1 = 'space-to-remove';
        const space2 = 'other-space';
        const obj1 = { type: SHAREABLE_OBJ_TYPE, id: 'id-1', spaces: [space2] }; // will not be changed
        const obj2 = { type: SHAREABLE_OBJ_TYPE, id: 'id-2', spaces: [space1, space2] }; // will be updated to remove space1
        const obj3 = { type: SHAREABLE_OBJ_TYPE, id: 'id-3', spaces: [space1] }; // will be deleted (since it would have no spaces left)

        const objects = [obj1, obj2, obj3];
        const spacesToRemove = [space1];
        const params = setup({ objects, spacesToRemove });
        // this test case does not call mget
        mockBulkResults({ error: false }, { error: false }); // results for obj2 and obj3

        await updateObjectsSpaces(params);
        expect(client.bulk).toHaveBeenCalledTimes(1);
        expectBulkArgs(
          { action: 'update', object: { ...obj2, namespaces: [space2] } },
          { action: 'delete', object: obj3 }
        );
      });

      it('when adding and removing spaces', async () => {
        const space1 = 'space-to-add';
        const space2 = 'space-to-remove';
        const space3 = 'other-space';
        const obj1 = { type: SHAREABLE_OBJ_TYPE, id: 'id-1', spaces: [space1] }; // will not be changed
        const obj2 = { type: SHAREABLE_OBJ_TYPE, id: 'id-2', spaces: [space3] }; // will be updated to add space1
        const obj3 = { type: SHAREABLE_OBJ_TYPE, id: 'id-3', spaces: [space1, space2] }; // will be updated to remove space2
        const obj4 = { type: SHAREABLE_OBJ_TYPE, id: 'id-4', spaces: [space2, space3] }; // will be updated to add space1 and remove space2

        const objects = [obj1, obj2, obj3, obj4];
        const spacesToAdd = [space1];
        const spacesToRemove = [space2];
        const params = setup({ objects, spacesToAdd, spacesToRemove });
        // this test case does not call mget
        mockBulkResults({ error: false }, { error: false }, { error: false }); // results for obj2, obj3, and obj4

        await updateObjectsSpaces(params);
        expect(client.bulk).toHaveBeenCalledTimes(1);
        expectBulkArgs(
          { action: 'update', object: { ...obj2, namespaces: [space3, space1] } },
          { action: 'update', object: { ...obj3, namespaces: [space1] } },
          { action: 'update', object: { ...obj4, namespaces: [space3, space1] } }
        );
      });
    });

    describe('does not call bulk if all objects do not need to be changed', () => {
      it('when adding spaces', async () => {
        const space = 'space-to-add';
        const obj1 = { type: SHAREABLE_OBJ_TYPE, id: 'id-1', spaces: [space] }; // will not be changed

        const objects = [obj1];
        const spacesToAdd = [space];
        const params = setup({ objects, spacesToAdd });
        // this test case does not call mget or bulk

        await updateObjectsSpaces(params);
        expect(client.bulk).not.toHaveBeenCalled();
      });

      it('when removing spaces', async () => {
        const space1 = 'space-to-remove';
        const space2 = 'other-space';
        const obj1 = { type: SHAREABLE_OBJ_TYPE, id: 'id-1', spaces: [space2] }; // will not be changed

        const objects = [obj1];
        const spacesToRemove = [space1];
        const params = setup({ objects, spacesToRemove });
        // this test case does not call mget or bulk

        await updateObjectsSpaces(params);
        expect(client.bulk).not.toHaveBeenCalled();
      });

      it('when adding and removing spaces', async () => {
        const space1 = 'space-to-add';
        const space2 = 'space-to-remove';
        const obj1 = { type: SHAREABLE_OBJ_TYPE, id: 'id-1', spaces: [space1] }; // will not be changed

        const objects = [obj1];
        const spacesToAdd = [space1];
        const spacesToRemove = [space2];
        const params = setup({ objects, spacesToAdd, spacesToRemove });
        // this test case does not call mget or bulk

        await updateObjectsSpaces(params);
        expect(client.bulk).not.toHaveBeenCalled();
      });
    });

    describe('legacy URL aliases', () => {
      it('does not delete aliases for objects that were not removed from any spaces', async () => {
        const space1 = 'space-to-add';
        const space2 = 'space-to-remove';
        const space3 = 'other-space';
        const obj1 = { type: SHAREABLE_OBJ_TYPE, id: 'id-1', spaces: [space1] }; // will not be changed
        const obj2 = { type: SHAREABLE_OBJ_TYPE, id: 'id-2', spaces: [space3] }; // will be updated

        const objects = [obj1, obj2];
        const spacesToAdd = [space1];
        const spacesToRemove = [space2];
        const params = setup({ objects, spacesToAdd, spacesToRemove });
        // this test case does not call mget
        mockBulkResults({ error: false }); // result for obj2

        await updateObjectsSpaces(params);
        expect(client.bulk).toHaveBeenCalledTimes(1);
        expectBulkArgs({ action: 'update', object: { ...obj2, namespaces: [space3, space1] } });
        expect(mockDeleteLegacyUrlAliases).not.toHaveBeenCalled();
        expect(params.logger.error).not.toHaveBeenCalled();
      });

      it('does not delete aliases for objects that were removed from spaces but were also added to All Spaces (*)', async () => {
        const space2 = 'space-to-remove';
        const obj1 = { type: SHAREABLE_OBJ_TYPE, id: 'id-1', spaces: [space2] };

        const objects = [obj1];
        const spacesToAdd = [ALL_NAMESPACES_STRING];
        const spacesToRemove = [space2];
        const params = setup({ objects, spacesToAdd, spacesToRemove });
        // this test case does not call mget
        mockBulkResults({ error: false }); // result for obj1

        await updateObjectsSpaces(params);
        expect(client.bulk).toHaveBeenCalledTimes(1);
        expectBulkArgs({
          action: 'update',
          object: { ...obj1, namespaces: [ALL_NAMESPACES_STRING] },
        });
        expect(mockDeleteLegacyUrlAliases).not.toHaveBeenCalled();
        expect(params.logger.error).not.toHaveBeenCalled();
      });

      it('deletes aliases for objects that were removed from specific spaces using "deleteBehavior: exclusive"', async () => {
        const space1 = 'space-to-remove';
        const space2 = 'another-space-to-remove';
        const space3 = 'other-space';
        const obj1 = { type: SHAREABLE_OBJ_TYPE, id: 'id-1', spaces: [space3] }; // will not be changed
        const obj2 = { type: SHAREABLE_OBJ_TYPE, id: 'id-1', spaces: [space1, space2, space3] }; // will be updated
        const obj3 = { type: SHAREABLE_OBJ_TYPE, id: 'id-1', spaces: [space1] }; // will be deleted

        const objects = [obj1, obj2, obj3];
        const spacesToRemove = [space1, space2];
        const params = setup({ objects, spacesToRemove });
        // this test case does not call mget
        mockBulkResults({ error: false }, { error: false }); // result2 for obj2 and obj3

        await updateObjectsSpaces(params);
        expect(client.bulk).toHaveBeenCalledTimes(1);
        expectBulkArgs(
          { action: 'update', object: { ...obj2, namespaces: [space3] } },
          { action: 'delete', object: obj3 }
        );
        expect(mockDeleteLegacyUrlAliases).toHaveBeenCalledTimes(2);
        expect(mockDeleteLegacyUrlAliases).toHaveBeenNthCalledWith(
          1, // the first call resulted in an error which generated a log message (see assertion below)
          expect.objectContaining({
            type: obj2.type,
            id: obj2.id,
            namespaces: [space1, space2],
            deleteBehavior: 'inclusive',
          })
        );
        expect(mockDeleteLegacyUrlAliases).toHaveBeenNthCalledWith(
          2,
          expect.objectContaining({
            type: obj3.type,
            id: obj3.id,
            namespaces: [space1],
            deleteBehavior: 'inclusive',
          })
        );
        expect(params.logger.error).not.toHaveBeenCalled();
      });

      it('deletes aliases for objects that were removed from all spaces using "deleteBehavior: inclusive"', async () => {
        const space1 = 'space-to-add';
        const space2 = 'other-space';
        const obj1 = { type: SHAREABLE_OBJ_TYPE, id: 'id-1', spaces: [space2] }; // will be updated to add space1
        const obj2 = {
          type: SHAREABLE_OBJ_TYPE,
          id: 'id-2',
          spaces: [space2, ALL_NAMESPACES_STRING], // will be updated to add space1 and remove *
        };

        const objects = [obj1, obj2];
        const spacesToAdd = [space1];
        const spacesToRemove = [ALL_NAMESPACES_STRING];
        const params = setup({ objects, spacesToAdd, spacesToRemove });
        // this test case does not call mget
        mockBulkResults({ error: false }); // result for obj1

        await updateObjectsSpaces(params);
        expect(client.bulk).toHaveBeenCalledTimes(1);
        expectBulkArgs(
          { action: 'update', object: { ...obj1, namespaces: [space2, space1] } },
          { action: 'update', object: { ...obj2, namespaces: [space2, space1] } }
        );
        expect(mockDeleteLegacyUrlAliases).toHaveBeenCalledTimes(1);
        expect(mockDeleteLegacyUrlAliases).toHaveBeenCalledWith(
          expect.objectContaining({
            type: obj2.type,
            id: obj2.id,
            namespaces: [space2, space1],
            deleteBehavior: 'exclusive',
          })
        );
        expect(params.logger.error).not.toHaveBeenCalled();
      });

      it('logs a message when deleteLegacyUrlAliases returns an error', async () => {
        const space1 = 'space-to-remove';
        const space2 = 'other-space';
        const obj1 = { type: SHAREABLE_OBJ_TYPE, id: 'id-1', spaces: [space1, space2] }; // will be updated

        const objects = [obj1];
        const spacesToRemove = [space1];
        const params = setup({ objects, spacesToRemove });
        // this test case does not call mget
        mockBulkResults({ error: false }); // result for obj1
        mockDeleteLegacyUrlAliases.mockRejectedValueOnce(new Error('Oh no!')); // result for deleting aliases for obj1

        await updateObjectsSpaces(params);
        expect(client.bulk).toHaveBeenCalledTimes(1);
        expectBulkArgs({ action: 'update', object: { ...obj1, namespaces: [space2] } });
        expect(mockDeleteLegacyUrlAliases).toHaveBeenCalledTimes(1); // don't assert deleteLegacyUrlAliases args, we have tests for that above
        expect(params.logger.error).toHaveBeenCalledTimes(1);
        expect(params.logger.error).toHaveBeenCalledWith(
          'Unable to delete aliases when unsharing an object: Oh no!'
        );
      });
    });
  });

  describe('returns expected results', () => {
    it('when adding spaces', async () => {
      const space1 = 'space-to-add';
      const space2 = 'other-space';
      const obj1 = { type: SHAREABLE_OBJ_TYPE, id: 'id-1', spaces: [space1] }; // will not be changed
      const obj2 = { type: SHAREABLE_OBJ_TYPE, id: 'id-2', spaces: [space2] }; // will be updated

      const objects = [obj1, obj2];
      const spacesToAdd = [space1];
      const params = setup({ objects, spacesToAdd });
      // this test case does not call mget
      mockBulkResults({ error: false }); // result for obj2

      const result = await updateObjectsSpaces(params);
      expect(result.objects).toEqual([
        { ...obj1, spaces: [space1] },
        { ...obj2, spaces: [space2, space1] },
      ]);
    });

    it('when removing spaces', async () => {
      const space1 = 'space-to-remove';
      const space2 = 'other-space';
      const obj1 = { type: SHAREABLE_OBJ_TYPE, id: 'id-1', spaces: [space2] }; // will not be changed
      const obj2 = { type: SHAREABLE_OBJ_TYPE, id: 'id-2', spaces: [space1, space2] }; // will be updated to remove space1
      const obj3 = { type: SHAREABLE_OBJ_TYPE, id: 'id-3', spaces: [space1] }; // will be deleted (since it would have no spaces left)

      const objects = [obj1, obj2, obj3];
      const spacesToRemove = [space1];
      const params = setup({ objects, spacesToRemove });
      // this test case does not call mget
      mockBulkResults({ error: false }, { error: false }); // results for obj2 and obj3

      const result = await updateObjectsSpaces(params);
      expect(result.objects).toEqual([
        { ...obj1, spaces: [space2] },
        { ...obj2, spaces: [space2] },
        { ...obj3, spaces: [] },
      ]);
    });

    it('when adding and removing spaces', async () => {
      const space1 = 'space-to-add';
      const space2 = 'space-to-remove';
      const space3 = 'other-space';
      const obj1 = { type: SHAREABLE_OBJ_TYPE, id: 'id-1', spaces: [space1] }; // will not be changed
      const obj2 = { type: SHAREABLE_OBJ_TYPE, id: 'id-2', spaces: [space3] }; // will be updated to add space1
      const obj3 = { type: SHAREABLE_OBJ_TYPE, id: 'id-3', spaces: [space1, space2] }; // will be updated to remove space2
      const obj4 = { type: SHAREABLE_OBJ_TYPE, id: 'id-4', spaces: [space2, space3] }; // will be updated to add space1 and remove space2

      const objects = [obj1, obj2, obj3, obj4];
      const spacesToAdd = [space1];
      const spacesToRemove = [space2];
      const params = setup({ objects, spacesToAdd, spacesToRemove });
      // this test case does not call mget
      mockBulkResults({ error: false }, { error: false }, { error: false }); // results for obj2, obj3, and obj4

      const result = await updateObjectsSpaces(params);
      expect(result.objects).toEqual([
        { ...obj1, spaces: [space1] },
        { ...obj2, spaces: [space3, space1] },
        { ...obj3, spaces: [space1] },
        { ...obj4, spaces: [space3, space1] },
      ]);
    });
  });
});
