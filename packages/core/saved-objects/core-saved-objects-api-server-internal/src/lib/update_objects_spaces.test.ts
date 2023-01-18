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

import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';

import { loggerMock } from '@kbn/logging-mocks';
import type { SavedObjectsUpdateObjectsSpacesObject } from '@kbn/core-saved-objects-api-server';
import { ALL_NAMESPACES_STRING } from '@kbn/core-saved-objects-utils-server';
import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-common';
import { SavedObjectsSerializer } from '@kbn/core-saved-objects-base-server-internal';
import { typeRegistryMock } from '@kbn/core-saved-objects-base-server-mocks';
import type { UpdateObjectsSpacesParams } from './update_objects_spaces';
import { updateObjectsSpaces } from './update_objects_spaces';
import { ISavedObjectsSecurityExtension } from '@kbn/core-saved-objects-server';
import {
  checkAuthError,
  enforceError,
  setupRedactPassthrough,
  setupAuthorizeUpdateSpaces,
  authMap,
} from '../test_helpers/repository.test.common';
import { savedObjectsExtensionsMock } from '../mocks/saved_objects_extensions.mock';

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
  jest.useFakeTimers();
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
  function setup(
    { objects = [], spacesToAdd = [], spacesToRemove = [], options }: SetupParams,
    securityExtension?: ISavedObjectsSecurityExtension
  ) {
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
      securityExtension,
      objects,
      spacesToAdd,
      spacesToRemove,
      options,
    };
  }

  /** Mocks the saved objects client so it returns the expected results */
  function mockMgetResults(
    ...results: Array<{ found: false } | { found: true; namespaces: string[] }>
  ) {
    client.mget.mockResponseOnce({
      docs: results.map((x) =>
        x.found
          ? {
              _id: 'doesnt-matter',
              _index: 'doesnt-matter',
              _source: { namespaces: x.namespaces },
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
  function mockMgetResultsNotFound() {
    client.mget.mockResponseOnce({ docs: [] }, { statusCode: 404, headers: {} });
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
      mockMgetResults({ found: true, namespaces: [EXISTING_SPACE] });
      client.bulk.mockReturnValueOnce(
        elasticsearchClientMock.createErrorTransportRequestPromise(new Error('bulk error'))
      );

      await expect(() => updateObjectsSpaces(params)).rejects.toThrow('bulk error');
    });

    it('returns mix of type errors, mget/bulk cluster errors, and successes', async () => {
      const obj1 = { type: SHAREABLE_HIDDEN_OBJ_TYPE, id: 'id-1' }; // invalid type (Not Found)
      const obj2 = { type: NON_SHAREABLE_OBJ_TYPE, id: 'id-2' }; // non-shareable type (Bad Request)
      const obj3 = { type: SHAREABLE_OBJ_TYPE, id: 'id-3' }; // mget error (found but doesn't exist in the current space)
      const obj4 = { type: SHAREABLE_OBJ_TYPE, id: 'id-4' }; // mget error (Not Found)
      const obj5 = { type: SHAREABLE_OBJ_TYPE, id: 'id-5' }; // bulk error (mocked as BULK_ERROR)
      const obj6 = { type: SHAREABLE_OBJ_TYPE, id: 'id-6' }; // success

      const objects = [obj1, obj2, obj3, obj4, obj5, obj6];
      const spacesToAdd = ['foo-space'];
      const params = setup({ objects, spacesToAdd });
      mockMgetResults(
        { found: true, namespaces: ['another-space'] }, // result for obj3
        { found: false }, // result for obj4
        { found: true, namespaces: [EXISTING_SPACE] }, // result for obj5
        { found: true, namespaces: [EXISTING_SPACE] } // result for obj6
      );
      mockRawDocExistsInNamespace.mockReturnValueOnce(false); // for obj3
      mockRawDocExistsInNamespace.mockReturnValueOnce(true); // for obj5
      mockRawDocExistsInNamespace.mockReturnValueOnce(true); // for obj6
      mockBulkResults({ error: true }, { error: false }); // results for obj5 and obj6

      const result = await updateObjectsSpaces(params);
      expect(client.mget).toHaveBeenCalledTimes(1);
      expectMgetArgs(obj3, obj4, obj5, obj6);
      expect(mockRawDocExistsInNamespace).toHaveBeenCalledTimes(3);
      expect(client.bulk).toHaveBeenCalledTimes(1);
      expectBulkArgs({ action: 'update', object: obj5 }, { action: 'update', object: obj6 });
      expect(result.objects).toEqual([
        { ...obj1, spaces: [], error: expect.objectContaining({ error: 'Not Found' }) },
        { ...obj2, spaces: [], error: expect.objectContaining({ error: 'Bad Request' }) },
        { ...obj3, spaces: [], error: expect.objectContaining({ error: 'Not Found' }) },
        { ...obj4, spaces: [], error: expect.objectContaining({ error: 'Not Found' }) },
        { ...obj5, spaces: [], error: BULK_ERROR },
        { ...obj6, spaces: [EXISTING_SPACE, 'foo-space'] },
      ]);
    });

    it('throws when mget not found response is missing the Elasticsearch header', async () => {
      const objects = [{ type: SHAREABLE_OBJ_TYPE, id: 'id-1' }];
      const spacesToAdd = ['foo-space'];
      const params = setup({ objects, spacesToAdd });
      mockMgetResultsNotFound();

      await expect(() => updateObjectsSpaces(params)).rejects.toThrowError(
        SavedObjectsErrorHelpers.createGenericNotFoundEsUnavailableError()
      );
    });
  });

  // Note: these test cases do not include requested objects that will result in errors (those are covered above)
  describe('cluster and module calls', () => {
    it('makes mget call for objects', async () => {
      const obj1 = { type: SHAREABLE_OBJ_TYPE, id: 'id-1' };
      const objects = [obj1];
      const spacesToAdd = ['foo-space'];
      const params = setup({ objects, spacesToAdd });
      mockMgetResults({ found: true, namespaces: [EXISTING_SPACE] }); // result for obj1
      mockBulkResults({ error: false }); // result for obj1

      await updateObjectsSpaces(params);
      expect(client.mget).toHaveBeenCalledTimes(1);
      expectMgetArgs(obj1);
    });

    describe('bulk call skips objects that will not be changed', () => {
      it('when adding spaces', async () => {
        const otherSpace = 'space-to-add';
        const obj1 = { type: SHAREABLE_OBJ_TYPE, id: 'id-1' };
        const obj2 = { type: SHAREABLE_OBJ_TYPE, id: 'id-2' };

        const objects = [obj1, obj2];
        const spacesToAdd = [otherSpace];
        const params = setup({ objects, spacesToAdd });
        mockMgetResults(
          { found: true, namespaces: [EXISTING_SPACE, otherSpace] }, // result for obj1 -- will not be changed
          { found: true, namespaces: [EXISTING_SPACE] } // result for obj2 -- will be updated to add otherSpace
        );
        mockBulkResults({ error: false }); // result for obj2

        await updateObjectsSpaces(params);
        expect(client.bulk).toHaveBeenCalledTimes(1);
        expectBulkArgs({
          action: 'update',
          object: { ...obj2, namespaces: [EXISTING_SPACE, otherSpace] },
        });
      });

      it('when removing spaces', async () => {
        const otherSpace = 'other-space';
        const obj1 = { type: SHAREABLE_OBJ_TYPE, id: 'id-1' };
        const obj2 = { type: SHAREABLE_OBJ_TYPE, id: 'id-2' };
        const obj3 = { type: SHAREABLE_OBJ_TYPE, id: 'id-3' };

        const objects = [obj1, obj2, obj3];
        const spacesToRemove = [EXISTING_SPACE];
        const params = setup({ objects, spacesToRemove });
        mockMgetResults(
          { found: true, namespaces: [ALL_NAMESPACES_STRING] }, // result for obj1 -- will not be changed
          { found: true, namespaces: [EXISTING_SPACE, otherSpace] }, // result for obj2 -- will be updated to remove EXISTING_SPACE
          { found: true, namespaces: [EXISTING_SPACE] } // result for obj3 -- will be deleted (since it would have no spaces left)
        );
        mockBulkResults({ error: false }, { error: false }); // results for obj2 and obj3

        await updateObjectsSpaces(params);
        expect(client.bulk).toHaveBeenCalledTimes(1);
        expectBulkArgs(
          { action: 'update', object: { ...obj2, namespaces: [otherSpace] } },
          { action: 'delete', object: obj3 }
        );
      });

      it('when adding and removing spaces', async () => {
        const space1 = 'space-to-add';
        const space2 = 'space-to-remove';
        const obj1 = { type: SHAREABLE_OBJ_TYPE, id: 'id-1' };
        const obj2 = { type: SHAREABLE_OBJ_TYPE, id: 'id-2' };
        const obj3 = { type: SHAREABLE_OBJ_TYPE, id: 'id-3' };
        const obj4 = { type: SHAREABLE_OBJ_TYPE, id: 'id-4' };

        const objects = [obj1, obj2, obj3, obj4];
        const spacesToAdd = [space1];
        const spacesToRemove = [space2];
        const params = setup({ objects, spacesToAdd, spacesToRemove });
        mockMgetResults(
          { found: true, namespaces: [EXISTING_SPACE, space1] }, // result for obj1 -- will not be changed
          { found: true, namespaces: [EXISTING_SPACE] }, // result for obj2 -- will be updated to add space1
          { found: true, namespaces: [EXISTING_SPACE, space1, space2] }, // result for obj3 -- will be updated to remove space2
          { found: true, namespaces: [EXISTING_SPACE, space2] } // result for obj3 -- will be updated to add space1 and remove space2
        );
        mockBulkResults({ error: false }, { error: false }, { error: false }); // results for obj2, obj3, and obj4

        await updateObjectsSpaces(params);
        expect(client.bulk).toHaveBeenCalledTimes(1);
        expectBulkArgs(
          { action: 'update', object: { ...obj2, namespaces: [EXISTING_SPACE, space1] } },
          { action: 'update', object: { ...obj3, namespaces: [EXISTING_SPACE, space1] } },
          { action: 'update', object: { ...obj4, namespaces: [EXISTING_SPACE, space1] } }
        );
      });
    });

    describe('does not call bulk if all objects do not need to be changed', () => {
      it('when adding spaces', async () => {
        const otherSpace = 'space-to-add';
        const obj1 = { type: SHAREABLE_OBJ_TYPE, id: 'id-1' };

        const objects = [obj1];
        const spacesToAdd = [otherSpace];
        const params = setup({ objects, spacesToAdd });
        mockMgetResults(
          { found: true, namespaces: [EXISTING_SPACE, otherSpace] } // result for obj1 -- will not be changed
        );
        // this test case does not call bulk

        await updateObjectsSpaces(params);
        expect(client.bulk).not.toHaveBeenCalled();
      });

      it('when removing spaces', async () => {
        const otherSpace = 'space-to-remove';
        const obj1 = { type: SHAREABLE_OBJ_TYPE, id: 'id-1' };

        const objects = [obj1];
        const spacesToRemove = [otherSpace];
        const params = setup({ objects, spacesToRemove });
        mockMgetResults(
          { found: true, namespaces: [EXISTING_SPACE] } // result for obj1 -- will not be changed
        );
        // this test case does not call bulk

        await updateObjectsSpaces(params);
        expect(client.bulk).not.toHaveBeenCalled();
      });

      it('when adding and removing spaces', async () => {
        const space1 = 'space-to-add';
        const space2 = 'space-to-remove';
        const obj1 = { type: SHAREABLE_OBJ_TYPE, id: 'id-1' };

        const objects = [obj1];
        const spacesToAdd = [space1];
        const spacesToRemove = [space2];
        const params = setup({ objects, spacesToAdd, spacesToRemove });
        mockMgetResults(
          { found: true, namespaces: [EXISTING_SPACE, space1] } // result for obj1 -- will not be changed
        );
        // this test case does not call bulk

        await updateObjectsSpaces(params);
        expect(client.bulk).not.toHaveBeenCalled();
      });
    });

    describe('legacy URL aliases', () => {
      it('does not delete aliases for objects that were not removed from any spaces', async () => {
        const space1 = 'space-to-add';
        const space2 = 'space-to-remove';
        const obj1 = { type: SHAREABLE_OBJ_TYPE, id: 'id-1' };
        const obj2 = { type: SHAREABLE_OBJ_TYPE, id: 'id-2' };

        const objects = [obj1, obj2];
        const spacesToAdd = [space1];
        const spacesToRemove = [space2];
        const params = setup({ objects, spacesToAdd, spacesToRemove });
        mockMgetResults(
          { found: true, namespaces: [EXISTING_SPACE, space1] }, // result for obj1 -- will not be changed
          { found: true, namespaces: [EXISTING_SPACE] } // result for obj2 -- will be updated to add space1
        );
        mockBulkResults({ error: false }); // result for obj2

        await updateObjectsSpaces(params);
        expect(client.bulk).toHaveBeenCalledTimes(1);
        expectBulkArgs({
          action: 'update',
          object: { ...obj2, namespaces: [EXISTING_SPACE, space1] },
        });
        expect(mockDeleteLegacyUrlAliases).not.toHaveBeenCalled();
        expect(params.logger.error).not.toHaveBeenCalled();
      });

      it('does not delete aliases for objects that were removed from spaces but were also added to All Spaces (*)', async () => {
        const obj1 = { type: SHAREABLE_OBJ_TYPE, id: 'id-1' };

        const objects = [obj1];
        const spacesToAdd = [ALL_NAMESPACES_STRING];
        const spacesToRemove = [EXISTING_SPACE];
        const params = setup({ objects, spacesToAdd, spacesToRemove });
        mockMgetResults(
          { found: true, namespaces: [EXISTING_SPACE] } // result for obj1 -- will be updated to remove EXISTING_SPACE and add *
        );
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

      it('deletes aliases for objects that were removed from specific spaces using "deleteBehavior: inclusive"', async () => {
        const space1 = 'space-to-remove';
        const space2 = 'other-space';
        const obj1 = { type: SHAREABLE_OBJ_TYPE, id: 'id-1' };
        const obj2 = { type: SHAREABLE_OBJ_TYPE, id: 'id-2' };
        const obj3 = { type: SHAREABLE_OBJ_TYPE, id: 'id-3' };

        const objects = [obj1, obj2, obj3];
        const spacesToRemove = [EXISTING_SPACE, space1];
        const params = setup({ objects, spacesToRemove });
        mockMgetResults(
          { found: true, namespaces: [ALL_NAMESPACES_STRING] }, // result for obj1 -- will not be changed
          { found: true, namespaces: [EXISTING_SPACE, space1, space2] }, // result for obj2 -- will be updated to remove EXISTING_SPACE and space1
          { found: true, namespaces: [EXISTING_SPACE] } // result for obj3 -- will be deleted
        );
        mockBulkResults({ error: false }, { error: false }); // result2 for obj2 and obj3

        await updateObjectsSpaces(params);
        expect(client.bulk).toHaveBeenCalledTimes(1);
        expectBulkArgs(
          { action: 'update', object: { ...obj2, namespaces: [space2] } },
          { action: 'delete', object: obj3 }
        );
        expect(mockDeleteLegacyUrlAliases).toHaveBeenCalledTimes(2);
        expect(mockDeleteLegacyUrlAliases).toHaveBeenNthCalledWith(
          1,
          expect.objectContaining({
            type: obj2.type,
            id: obj2.id,
            namespaces: [EXISTING_SPACE, space1],
            deleteBehavior: 'inclusive',
          })
        );
        expect(mockDeleteLegacyUrlAliases).toHaveBeenNthCalledWith(
          2,
          expect.objectContaining({
            type: obj3.type,
            id: obj3.id,
            namespaces: [EXISTING_SPACE],
            deleteBehavior: 'inclusive',
          })
        );
        expect(params.logger.error).not.toHaveBeenCalled();
      });

      it('deletes aliases for objects that were removed from all spaces using "deleteBehavior: exclusive"', async () => {
        const otherSpace = 'space-to-add';
        const obj1 = { type: SHAREABLE_OBJ_TYPE, id: 'id-1' };
        const obj2 = { type: SHAREABLE_OBJ_TYPE, id: 'id-2' };

        const objects = [obj1, obj2];
        const spacesToAdd = [EXISTING_SPACE, otherSpace];
        const spacesToRemove = [ALL_NAMESPACES_STRING];
        const params = setup({ objects, spacesToAdd, spacesToRemove });
        mockMgetResults(
          { found: true, namespaces: [EXISTING_SPACE] }, // result for obj1 -- will be updated to add otherSpace
          { found: true, namespaces: [ALL_NAMESPACES_STRING] } // result for obj2 -- will be updated to remove * and add EXISTING_SPACE and otherSpace
        );
        mockBulkResults({ error: false }, { error: false }); // result for obj1 and obj2

        await updateObjectsSpaces(params);
        expect(client.bulk).toHaveBeenCalledTimes(1);
        expectBulkArgs(
          { action: 'update', object: { ...obj1, namespaces: [EXISTING_SPACE, otherSpace] } },
          { action: 'update', object: { ...obj2, namespaces: [EXISTING_SPACE, otherSpace] } }
        );
        expect(mockDeleteLegacyUrlAliases).toHaveBeenCalledTimes(1);
        expect(mockDeleteLegacyUrlAliases).toHaveBeenCalledWith(
          expect.objectContaining({
            type: obj2.type,
            id: obj2.id,
            namespaces: [EXISTING_SPACE, otherSpace],
            deleteBehavior: 'exclusive',
          })
        );
        expect(params.logger.error).not.toHaveBeenCalled();
      });

      it('logs a message when deleteLegacyUrlAliases returns an error', async () => {
        const otherSpace = 'other-space';
        const obj1 = { type: SHAREABLE_OBJ_TYPE, id: 'id-1' };

        const objects = [obj1];
        const spacesToRemove = [otherSpace];
        const params = setup({ objects, spacesToRemove });
        mockMgetResults(
          { found: true, namespaces: [EXISTING_SPACE, otherSpace] } // result for obj1 -- will be updated to remove otherSpace
        );
        mockBulkResults({ error: false }); // result for obj1
        mockDeleteLegacyUrlAliases.mockRejectedValueOnce(new Error('Oh no!')); // result for deleting aliases for obj1

        await updateObjectsSpaces(params);
        expect(client.bulk).toHaveBeenCalledTimes(1);
        expectBulkArgs({ action: 'update', object: { ...obj1, namespaces: [EXISTING_SPACE] } });
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
      const otherSpace = 'space-to-add';
      const obj1 = { type: SHAREABLE_OBJ_TYPE, id: 'id-1' };
      const obj2 = { type: SHAREABLE_OBJ_TYPE, id: 'id-2' };

      const objects = [obj1, obj2];
      const spacesToAdd = [otherSpace];
      const params = setup({ objects, spacesToAdd });
      mockMgetResults(
        { found: true, namespaces: [EXISTING_SPACE, otherSpace] }, // result for obj1 -- will not be changed
        { found: true, namespaces: [EXISTING_SPACE] } // result for obj2 -- will be updated to add otherSpace
      );
      mockBulkResults({ error: false }); // result for obj2

      const result = await updateObjectsSpaces(params);
      expect(result.objects).toEqual([
        { ...obj1, spaces: [EXISTING_SPACE, otherSpace] },
        { ...obj2, spaces: [EXISTING_SPACE, otherSpace] },
      ]);
    });

    it('when removing spaces', async () => {
      const otherSpace = 'other-space';
      const obj1 = { type: SHAREABLE_OBJ_TYPE, id: 'id-1' };
      const obj2 = { type: SHAREABLE_OBJ_TYPE, id: 'id-2' };
      const obj3 = { type: SHAREABLE_OBJ_TYPE, id: 'id-3' };

      const objects = [obj1, obj2, obj3];
      const spacesToRemove = [EXISTING_SPACE];
      const params = setup({ objects, spacesToRemove });
      mockMgetResults(
        { found: true, namespaces: [ALL_NAMESPACES_STRING] }, // result for obj1 -- will not be changed
        { found: true, namespaces: [EXISTING_SPACE, otherSpace] }, // result for obj2 -- will be updated to remove EXISTING_SPACE
        { found: true, namespaces: [EXISTING_SPACE] } // result for obj3 -- will be deleted (since it would have no spaces left)
      );
      mockBulkResults({ error: false }, { error: false }); // results for obj2 and obj3

      const result = await updateObjectsSpaces(params);
      expect(result.objects).toEqual([
        { ...obj1, spaces: [ALL_NAMESPACES_STRING] },
        { ...obj2, spaces: [otherSpace] },
        { ...obj3, spaces: [] },
      ]);
    });

    it('when adding and removing spaces', async () => {
      const otherSpace = 'space-to-add';
      const obj1 = { type: SHAREABLE_OBJ_TYPE, id: 'id-1' };
      const obj2 = { type: SHAREABLE_OBJ_TYPE, id: 'id-2' };
      const obj3 = { type: SHAREABLE_OBJ_TYPE, id: 'id-3' };
      const obj4 = { type: SHAREABLE_OBJ_TYPE, id: 'id-4' };

      const objects = [obj1, obj2, obj3, obj4];
      const spacesToAdd = [otherSpace];
      const spacesToRemove = [EXISTING_SPACE];
      const params = setup({ objects, spacesToAdd, spacesToRemove });
      mockMgetResults(
        { found: true, namespaces: [ALL_NAMESPACES_STRING, otherSpace] }, // result for obj1 -- will not be changed
        { found: true, namespaces: [ALL_NAMESPACES_STRING] }, // result for obj2 -- will be updated to add otherSpace
        { found: true, namespaces: [EXISTING_SPACE, otherSpace] }, // result for obj3 -- will be updated to remove EXISTING_SPACE
        { found: true, namespaces: [EXISTING_SPACE] } // result for obj4 -- will be updated to remove EXISTING_SPACE and add otherSpace
      );
      mockBulkResults({ error: false }, { error: false }, { error: false }); // results for obj2, obj3, and obj4

      const result = await updateObjectsSpaces(params);
      expect(result.objects).toEqual([
        { ...obj1, spaces: [ALL_NAMESPACES_STRING, otherSpace] },
        { ...obj2, spaces: [ALL_NAMESPACES_STRING, otherSpace] },
        { ...obj3, spaces: [otherSpace] },
        { ...obj4, spaces: [otherSpace] },
      ]);
    });
  });

  describe(`with security extension`, () => {
    let mockSecurityExt: jest.Mocked<ISavedObjectsSecurityExtension>;
    let params: UpdateObjectsSpacesParams;

    const otherSpace = 'space-to-add';
    const obj1 = {
      type: SHAREABLE_OBJ_TYPE,
      id: 'id-1',
      spaces: [ALL_NAMESPACES_STRING, otherSpace],
    };
    const obj2 = { type: SHAREABLE_OBJ_TYPE, id: 'id-2', spaces: [ALL_NAMESPACES_STRING] };
    const obj3 = { type: SHAREABLE_OBJ_TYPE, id: 'id-3', spaces: [EXISTING_SPACE, otherSpace] };
    const obj4 = { type: SHAREABLE_OBJ_TYPE, id: 'id-4', spaces: [EXISTING_SPACE] };

    const objects = [obj1, obj2, obj3, obj4];
    const spacesToAdd = [otherSpace];
    const spacesToRemove = [EXISTING_SPACE];

    afterEach(() => {
      mockSecurityExt.authorize.mockClear();
      mockSecurityExt.redactNamespaces.mockClear();
    });

    beforeEach(() => {
      mockSecurityExt = savedObjectsExtensionsMock.createSecurityExtension();
      params = setup(
        { objects, spacesToAdd, spacesToRemove, options: { namespace: 'foo-namespace' } },
        mockSecurityExt
      );
      mockMgetResults(
        { found: true, namespaces: [ALL_NAMESPACES_STRING, otherSpace] }, // result for obj1 -- will not be changed
        { found: true, namespaces: [ALL_NAMESPACES_STRING] }, // result for obj2 -- will be updated to add otherSpace
        { found: true, namespaces: [EXISTING_SPACE, otherSpace] }, // result for obj3 -- will be updated to remove EXISTING_SPACE
        { found: true, namespaces: [EXISTING_SPACE] } // result for obj4 -- will be updated to remove EXISTING_SPACE and add otherSpace
      );
      mockBulkResults({ error: false }, { error: false }, { error: false }); // results for obj2, obj3, and obj4
    });

    test(`propagates error from es client bulk get`, async () => {
      setupAuthorizeUpdateSpaces(mockSecurityExt, 'fully_authorized');
      setupRedactPassthrough(mockSecurityExt);

      const error = SavedObjectsErrorHelpers.createBadRequestError('OOPS!');

      mockGetBulkOperationError.mockReset();
      client.bulk.mockReset();
      client.bulk.mockImplementationOnce(() => {
        throw error;
      });

      await expect(updateObjectsSpaces(params)).rejects.toThrow(error);
    });

    test(`propagates decorated error when authorizeUpdateSpaces rejects promise`, async () => {
      mockSecurityExt.authorizeUpdateSpaces.mockRejectedValueOnce(checkAuthError);

      await expect(updateObjectsSpaces(params)).rejects.toThrow(checkAuthError);
      expect(mockSecurityExt.authorizeUpdateSpaces).toHaveBeenCalledTimes(1);
    });

    test(`propagates decorated error when unauthorized`, async () => {
      setupAuthorizeUpdateSpaces(mockSecurityExt, 'unauthorized');

      await expect(updateObjectsSpaces(params)).rejects.toThrow(enforceError);
      expect(mockSecurityExt.authorizeUpdateSpaces).toHaveBeenCalledTimes(1);
    });

    test(`returns result when authorized`, async () => {
      setupAuthorizeUpdateSpaces(mockSecurityExt, 'fully_authorized');
      setupRedactPassthrough(mockSecurityExt);

      const result = await updateObjectsSpaces(params);

      expect(mockSecurityExt.authorizeUpdateSpaces).toHaveBeenCalledTimes(1);
      expect(client.bulk).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        objects: [
          obj1,
          { ...obj2, spaces: [...obj2.spaces, otherSpace] },
          { ...obj3, spaces: spacesToAdd },
          { ...obj4, spaces: spacesToAdd },
        ],
      });
    });

    test(`calls authorizeUpdateSpaces with correct parameters`, async () => {
      setupAuthorizeUpdateSpaces(mockSecurityExt, 'fully_authorized');
      setupRedactPassthrough(mockSecurityExt);

      await updateObjectsSpaces(params);

      expect(mockSecurityExt.authorizeUpdateSpaces).toHaveBeenCalledTimes(1);
      expect(mockSecurityExt.authorizeUpdateSpaces).toHaveBeenCalledWith({
        namespace: 'foo-namespace',
        spacesToAdd,
        spacesToRemove,
        objects: [
          {
            type: obj1.type,
            id: obj1.id,
            existingNamespaces: obj1.spaces,
          },
          {
            type: obj2.type,
            id: obj2.id,
            existingNamespaces: obj2.spaces,
          },
          {
            type: obj3.type,
            id: obj3.id,
            existingNamespaces: obj3.spaces,
          },
          {
            type: obj4.type,
            id: obj4.id,
            existingNamespaces: obj4.spaces,
          },
        ],
      });
    });

    test(`calls authorizeUpdateSpaces with '*' when spacesToAdd includes '*'`, async () => {
      setupAuthorizeUpdateSpaces(mockSecurityExt, 'fully_authorized');
      setupRedactPassthrough(mockSecurityExt);

      await updateObjectsSpaces({ ...params, spacesToAdd: ['*'] });

      expect(mockSecurityExt.authorizeUpdateSpaces).toHaveBeenCalledTimes(1);
      expect(mockSecurityExt.authorizeUpdateSpaces).toHaveBeenCalledWith({
        namespace: 'foo-namespace',
        spacesToAdd: ['*'],
        spacesToRemove,
        objects: [
          {
            type: obj1.type,
            id: obj1.id,
            existingNamespaces: obj1.spaces,
          },
          {
            type: obj2.type,
            id: obj2.id,
            existingNamespaces: obj2.spaces,
          },
          {
            type: obj3.type,
            id: obj3.id,
            existingNamespaces: obj3.spaces,
          },
          {
            type: obj4.type,
            id: obj4.id,
            existingNamespaces: obj4.spaces,
          },
        ],
      });
    });

    test(`calls authorizeUpdateSpaces with '*' when spacesToRemove includes '*'`, async () => {
      setupAuthorizeUpdateSpaces(mockSecurityExt, 'fully_authorized');
      setupRedactPassthrough(mockSecurityExt);

      await updateObjectsSpaces({ ...params, spacesToRemove: ['*'] });

      expect(mockSecurityExt.authorizeUpdateSpaces).toHaveBeenCalledTimes(1);
      expect(mockSecurityExt.authorizeUpdateSpaces).toHaveBeenCalledWith({
        namespace: 'foo-namespace',
        spacesToAdd,
        spacesToRemove: ['*'],
        objects: [
          {
            type: obj1.type,
            id: obj1.id,
            existingNamespaces: obj1.spaces,
          },
          {
            type: obj2.type,
            id: obj2.id,
            existingNamespaces: obj2.spaces,
          },
          {
            type: obj3.type,
            id: obj3.id,
            existingNamespaces: obj3.spaces,
          },
          {
            type: obj4.type,
            id: obj4.id,
            existingNamespaces: obj4.spaces,
          },
        ],
      });
    });

    test(`calls redactNamespaces with authorization map`, async () => {
      setupAuthorizeUpdateSpaces(mockSecurityExt, 'fully_authorized');
      setupRedactPassthrough(mockSecurityExt);

      await updateObjectsSpaces(params);

      expect(mockSecurityExt.authorizeUpdateSpaces).toHaveBeenCalledTimes(1);
      expect(mockSecurityExt.redactNamespaces).toHaveBeenCalledTimes(4);

      objects.forEach((obj, i) => {
        expect(mockSecurityExt.redactNamespaces).toHaveBeenNthCalledWith(i + 1, {
          savedObject: {
            type: obj.type,
            namespaces: [...new Set(obj.spaces.concat(spacesToAdd))].filter(
              (element) => !spacesToRemove.includes(element)
            ),
          },
          typeMap: authMap,
        });
      });
    });
    //   // const defaultSpace = 'default';
    //   // const otherSpace = 'space-to-add';
    //   // const obj1 = { type: SHAREABLE_OBJ_TYPE, id: 'id-1' };
    //   // const obj2 = { type: SHAREABLE_OBJ_TYPE, id: 'id-2' };
    //   // const obj3 = { type: SHAREABLE_OBJ_TYPE, id: 'id-3' };
    //   // const obj4 = { type: SHAREABLE_OBJ_TYPE, id: 'id-4' };

    //   // const objects = [obj1, obj2, obj3, obj4];
    //   // const spacesToAdd = [otherSpace];
    //   // const spacesToRemove = [EXISTING_SPACE];

    //   beforeEach(() => {
    //     mockSecurityExt = savedObjectsExtensionsMock.createSecurityExtension();
    //     params = setup({ objects, spacesToAdd, spacesToRemove }, mockSecurityExt);
    //     mockMgetResults(
    //       { found: true, namespaces: [ALL_NAMESPACES_STRING, otherSpace] }, // result for obj1 -- will not be changed
    //       { found: true, namespaces: [ALL_NAMESPACES_STRING] }, // result for obj2 -- will be updated to add otherSpace
    //       { found: true, namespaces: [EXISTING_SPACE, otherSpace] }, // result for obj3 -- will be updated to remove EXISTING_SPACE
    //       { found: true, namespaces: [EXISTING_SPACE] } // result for obj4 -- will be updated to remove EXISTING_SPACE and add otherSpace
    //     );
    //     mockBulkResults({ error: false }, { error: false }, { error: false }); // results for obj2, obj3, and obj4
    //     setupAuthorizeFullyAuthorized(mockSecurityExt);
    //     setupRedactPassthrough(mockSecurityExt);
    //   });

    //   test(`calls performAuthorization with correct actions, types, spaces, and enforce map`, async () => {
    //     await updateObjectsSpaces(params);

    //     expect(client.bulk).toHaveBeenCalledTimes(1);
    //     expect(mockSecurityExt.authorize).toHaveBeenCalledTimes(1);
    //     const expectedActions = new Set([SecurityAction.UPDATE_OBJECTS_SPACES]);
    //     const expectedSpaces = new Set([defaultSpace, otherSpace, EXISTING_SPACE]);
    //     const expectedTypes = new Set([SHAREABLE_OBJ_TYPE]);
    //     const expectedEnforceMap = new Map<string, Set<string>>();
    //     expectedEnforceMap.set(
    //       SHAREABLE_OBJ_TYPE,
    //       new Set([defaultSpace, otherSpace, EXISTING_SPACE])
    //     );

    //     const {
    //       actions: actualActions,
    //       spaces: actualSpaces,
    //       types: actualTypes,
    //       enforceMap: actualEnforceMap,
    //       options: actualOptions,
    //     } = mockSecurityExt.authorize.mock.calls[0][0];

    //     expect(setsAreEqual(actualActions, expectedActions)).toBeTruthy();
    //     expect(setsAreEqual(actualSpaces, expectedSpaces)).toBeTruthy();
    //     expect(setsAreEqual(actualTypes, expectedTypes)).toBeTruthy();
    //     expect(setMapsAreEqual(actualEnforceMap, expectedEnforceMap)).toBeTruthy();
    //     expect(actualOptions).toEqual(expect.objectContaining({ allowGlobalResource: true }));
    //   });
    // });

    // describe('all spaces', () => {
    //   const defaultSpace = 'default';
    //   const otherSpace = 'space-to-add';
    //   const obj1 = { type: SHAREABLE_OBJ_TYPE, id: 'id-1' };
    //   const obj2 = { type: SHAREABLE_OBJ_TYPE, id: 'id-2' };
    //   const obj3 = { type: SHAREABLE_OBJ_TYPE, id: 'id-3' };
    //   const obj4 = { type: SHAREABLE_OBJ_TYPE, id: 'id-4' };
    //   const objects = [obj1, obj2, obj3, obj4];

    //   const setupForAllSpaces = (spacesToAdd: string[], spacesToRemove: string[]) => {
    //     mockSecurityExt = savedObjectsExtensionsMock.createSecurityExtension();
    //     params = setup({ objects, spacesToAdd, spacesToRemove }, mockSecurityExt);
    //     mockMgetResults(
    //       { found: true, namespaces: [ALL_NAMESPACES_STRING, otherSpace] }, // result for obj1 -- will not be changed
    //       { found: true, namespaces: [ALL_NAMESPACES_STRING] }, // result for obj2 -- will be updated to add otherSpace
    //       { found: true, namespaces: [EXISTING_SPACE, otherSpace] }, // result for obj3 -- will be updated to remove EXISTING_SPACE
    //       { found: true, namespaces: [EXISTING_SPACE] } // result for obj4 -- will be updated to remove EXISTING_SPACE and add otherSpace
    //     );
    //     mockBulkResults({ error: false }, { error: false }, { error: false }); // results for obj2, obj3, and obj4
    //     setupAuthorizeFullyAuthorized(mockSecurityExt);
    //     setupRedactPassthrough(mockSecurityExt);
    //   };

    //   test(`calls performAuthorization with '*' when spacesToAdd includes '*'`, async () => {
    //     const spacesToAdd = ['*'];
    //     const spacesToRemove = [otherSpace];
    //     setupForAllSpaces(spacesToAdd, spacesToRemove);
    //     await updateObjectsSpaces(params);

    //     expect(client.bulk).toHaveBeenCalledTimes(1);
    //     expect(mockSecurityExt.authorize).toHaveBeenCalledTimes(1);
    //     const expectedActions = new Set([SecurityAction.UPDATE_OBJECTS_SPACES]);
    //     const expectedSpaces = new Set(['*', defaultSpace, otherSpace, EXISTING_SPACE]);
    //     const expectedTypes = new Set([SHAREABLE_OBJ_TYPE]);
    //     const expectedEnforceMap = new Map<string, Set<string>>();
    //     expectedEnforceMap.set(
    //       SHAREABLE_OBJ_TYPE,
    //       new Set([defaultSpace, otherSpace, ...spacesToAdd])
    //     );

    //     const {
    //       actions: actualActions,
    //       spaces: actualSpaces,
    //       types: actualTypes,
    //       enforceMap: actualEnforceMap,
    //       options: actualOptions,
    //     } = mockSecurityExt.authorize.mock.calls[0][0];

    //     expect(setsAreEqual(actualActions, expectedActions)).toBeTruthy();
    //     expect(setsAreEqual(actualSpaces, expectedSpaces)).toBeTruthy();
    //     expect(setsAreEqual(actualTypes, expectedTypes)).toBeTruthy();
    //     expect(setMapsAreEqual(actualEnforceMap, expectedEnforceMap)).toBeTruthy();
    //     expect(actualOptions).toEqual(expect.objectContaining({ allowGlobalResource: true }));
    //   });

    //   test(`calls performAuthorization with '*' when spacesToRemove includes '*'`, async () => {
    //     const spacesToAdd = [otherSpace];
    //     const spacesToRemove = ['*'];
    //     setupForAllSpaces(spacesToAdd, spacesToRemove);
    //     await updateObjectsSpaces(params);

    //     expect(client.bulk).toHaveBeenCalledTimes(1);
    //     expect(mockSecurityExt.authorize).toHaveBeenCalledTimes(1);
    //     const expectedActions = new Set([SecurityAction.UPDATE_OBJECTS_SPACES]);
    //     const expectedSpaces = new Set(['*', defaultSpace, otherSpace, EXISTING_SPACE]);
    //     const expectedTypes = new Set([SHAREABLE_OBJ_TYPE]);
    //     const expectedEnforceMap = new Map<string, Set<string>>();
    //     expectedEnforceMap.set(
    //       SHAREABLE_OBJ_TYPE,
    //       new Set([defaultSpace, otherSpace, ...spacesToRemove])
    //     );

    //     const {
    //       actions: actualActions,
    //       spaces: actualSpaces,
    //       types: actualTypes,
    //       enforceMap: actualEnforceMap,
    //       options: actualOptions,
    //     } = mockSecurityExt.authorize.mock.calls[0][0];

    //     expect(setsAreEqual(actualActions, expectedActions)).toBeTruthy();
    //     expect(setsAreEqual(actualSpaces, expectedSpaces)).toBeTruthy();
    //     expect(setsAreEqual(actualTypes, expectedTypes)).toBeTruthy();
    //     expect(setMapsAreEqual(actualEnforceMap, expectedEnforceMap)).toBeTruthy();
    //     expect(actualOptions).toEqual(expect.objectContaining({ allowGlobalResource: true }));
    //   });
    // });
  });
});
