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
} from './__mocks__/internal_utils';

import type { DeeplyMockedKeys } from '@kbn/utility-types/target/jest';
import type { ElasticsearchClient } from 'src/core/server/elasticsearch';
import { elasticsearchClientMock } from 'src/core/server/elasticsearch/client/mocks';

import { typeRegistryMock } from '../../saved_objects_type_registry.mock';
import { SavedObjectsSerializer } from '../../serialization';
import type { SavedObjectsCollectMultiNamespaceReferencesObject } from './collect_multi_namespace_references';
import type { UpdateObjectsSpacesParams } from './update_objects_spaces';
import { updateObjectsSpaces } from './update_objects_spaces';

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

beforeEach(() => {
  mockGetExpectedVersionProperties.mockReturnValue(EXPECTED_VERSION_PROPS);
});

describe('#updateObjectsSpaces', () => {
  let client: DeeplyMockedKeys<ElasticsearchClient>;

  /** Sets up the type registry, saved objects client, etc. and return the full parameters object to be passed to `collectMultiNamespaceReferences` */
  function setup({ objects = [], spacesToAdd = [], spacesToRemove = [], options }: SetupParams) {
    const registry = typeRegistryMock.create();
    registry.isShareable.mockImplementation(
      (type) => [SHAREABLE_OBJ_TYPE, SHAREABLE_HIDDEN_OBJ_TYPE].includes(type) // NON_SHAREABLE_OBJ_TYPE is excluded
    );
    client = elasticsearchClientMock.createElasticsearchClient();
    const serializer = new SavedObjectsSerializer(registry);
    return {
      registry,
      allowedTypes: [SHAREABLE_OBJ_TYPE, NON_SHAREABLE_OBJ_TYPE], // SHAREABLE_HIDDEN_OBJ_TYPE is excluded
      client,
      serializer,
      getIndexForType: (type: string) => `index-for-${type}`,
      collectMultiNamespaceReferences: jest
        .fn()
        .mockReturnValue({ objects: objects.map((x) => ({ ...x, spaces: [EXISTING_SPACE] })) }),
      objects,
      spacesToAdd,
      spacesToRemove,
      options,
    };
  }

  /** Mocks the saved objects client so it returns the expected results */
  function mockMgetResults(...results: Array<{ found: boolean }>) {
    client.mget.mockReturnValueOnce(
      elasticsearchClientMock.createSuccessTransportRequestPromise({
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
      })
    );
  }

  /** Asserts that mget is called for the given objects */
  function expectMgetArgs(...objects: SavedObjectsCollectMultiNamespaceReferencesObject[]) {
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
    client.bulk.mockReturnValueOnce(
      elasticsearchClientMock.createSuccessTransportRequestPromise({
        items: results.map(() => ({})), // as long as the result does not contain an error field, it is treated as a success
        errors: false,
        took: 0,
      })
    );
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
          ? [operation, { doc: expect.objectContaining({ namespaces }) }] // 'update' uses an operation and document metadata
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

    it('throws when collectMultiNamespaceReferences call fails', async () => {
      const objects = [{ type: SHAREABLE_OBJ_TYPE, id: 'id-1' }];
      const spacesToAdd = ['foo-space'];
      const options = { includeReferences: true };
      const params = setup({ objects, spacesToAdd, options });
      params.collectMultiNamespaceReferences.mockRejectedValue(new Error('collect error'));

      await expect(() => updateObjectsSpaces(params)).rejects.toThrow('collect error');
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
      const obj3 = { type: SHAREABLE_OBJ_TYPE, id: 'id-3' }; // mget error (Not Found)
      const obj4 = { type: SHAREABLE_OBJ_TYPE, id: 'id-4' }; // bulk error (mocked as BULK_ERROR)
      const obj5 = { type: SHAREABLE_OBJ_TYPE, id: 'id-5' }; // success

      const objects = [obj1, obj2, obj3, obj4, obj5];
      const spacesToAdd = ['foo-space'];
      const params = setup({ objects, spacesToAdd });
      mockMgetResults({ found: false }, { found: true }, { found: true }); // results for obj3, obj4, and obj5
      mockBulkResults({ error: true }, { error: false }); // results for obj4 and obj5

      const result = await updateObjectsSpaces(params);
      expect(client.mget).toHaveBeenCalledTimes(1);
      expectMgetArgs(obj3, obj4, obj5);
      expect(client.bulk).toHaveBeenCalledTimes(1);
      expectBulkArgs({ action: 'update', object: obj4 }, { action: 'update', object: obj5 });
      expect(result.objects).toEqual([
        { ...obj1, spaces: [], error: expect.objectContaining({ error: 'Not Found' }) },
        { ...obj2, spaces: [], error: expect.objectContaining({ error: 'Bad Request' }) },
        { ...obj3, spaces: [], error: expect.objectContaining({ error: 'Not Found' }) },
        { ...obj4, spaces: [], error: BULK_ERROR },
        { ...obj5, spaces: [EXISTING_SPACE, 'foo-space'] },
      ]);
    });

    it('returns mix of type errors, collector errors, bulk cluster errors, and successes if the "includeReferences" option is used', async () => {
      const obj1 = { type: SHAREABLE_HIDDEN_OBJ_TYPE, id: 'id-1' }; // invalid type (Not Found)
      const obj2 = { type: NON_SHAREABLE_OBJ_TYPE, id: 'id-2' }; // non-shareable type (Bad Request)
      const obj3 = { type: SHAREABLE_OBJ_TYPE, id: 'id-3' }; // collector error (Not Found)
      const obj4 = { type: SHAREABLE_OBJ_TYPE, id: 'id-4' }; // bulk error (mocked as BULK_ERROR)
      const obj5 = { type: SHAREABLE_OBJ_TYPE, id: 'id-5' }; // success

      const objects = [obj1, obj2, obj3, obj4, obj5]; // doesn't matter what the input is, when "includeReferences" is enabled, the output of collectMultiNamespaceReferences is used instead
      const spacesToAdd = ['foo-space'];
      const options = { includeReferences: true };
      const params = setup({ objects, spacesToAdd, options });
      // this test case does not call mget
      params.collectMultiNamespaceReferences.mockResolvedValue({
        objects: [
          { ...obj1, spaces: [] }, // realistically, obj1 would include 'isMissing: true' because it's an invalid type, but for the purposes of this test let's ensure that it is treated as Not Found regardless
          { ...obj2, spaces: [] },
          { ...obj3, spaces: [], isMissing: true },
          { ...obj4, spaces: [EXISTING_SPACE] },
          { ...obj5, spaces: [EXISTING_SPACE] },
        ],
      });
      mockBulkResults({ error: true }, { error: false }); // results for obj4 and obj5

      const result = await updateObjectsSpaces(params);
      expect(params.collectMultiNamespaceReferences).toHaveBeenCalledTimes(1);
      expect(params.collectMultiNamespaceReferences).toHaveBeenCalledWith(objects);
      expect(client.mget).not.toHaveBeenCalled();
      expect(client.bulk).toHaveBeenCalledTimes(1);
      expectBulkArgs({ action: 'update', object: obj4 }, { action: 'update', object: obj5 });
      expect(result.objects).toEqual([
        { ...obj1, spaces: [], error: expect.objectContaining({ error: 'Not Found' }) },
        { ...obj2, spaces: [], error: expect.objectContaining({ error: 'Bad Request' }) },
        { ...obj3, spaces: [], error: expect.objectContaining({ error: 'Not Found' }) },
        { ...obj4, spaces: [], error: BULK_ERROR },
        { ...obj5, spaces: [EXISTING_SPACE, 'foo-space'] },
      ]);
    });
  });

  describe('cluster and module calls', () => {
    it('mget call skips objects that have "spaces" defined', async () => {
      const obj1 = { type: SHAREABLE_OBJ_TYPE, id: 'id-1', spaces: [EXISTING_SPACE] }; // will not be passed to mget
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
      const obj1 = { type: SHAREABLE_OBJ_TYPE, id: 'id-1', spaces: [EXISTING_SPACE] }; // will not be passed to mget

      const objects = [obj1];
      const spacesToAdd = ['foo-space'];
      const params = setup({ objects, spacesToAdd });
      mockBulkResults({ error: false }); // result for obj1

      await updateObjectsSpaces(params);
      expect(client.mget).not.toHaveBeenCalled();
    });

    it('calls collectMultiNamespaceReferences and does not call mget if the "includeReferences" option is used', async () => {
      // Both assertions are true because the return value of collectMultiNamespaceReferences includes a "spaces" attribute for each object.
      // That's an implementation detail of collectMultiNamespaceReferences, but this test case is included for clarity.
      const obj1 = { type: SHAREABLE_OBJ_TYPE, id: 'id-1' }; // will not be passed to mget

      const objects = [obj1];
      const spacesToAdd = ['foo-space'];
      const options = { includeReferences: true };
      const params = setup({ objects, spacesToAdd, options });
      mockBulkResults({ error: false }); // result for obj1

      await updateObjectsSpaces(params);
      expect(params.collectMultiNamespaceReferences).toHaveBeenCalledTimes(1);
      expect(params.collectMultiNamespaceReferences).toHaveBeenCalledWith(objects);
      expect(client.mget).not.toHaveBeenCalled();
    });

    describe('bulk call skips objects that will not be modified', () => {
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
        const obj4 = { type: SHAREABLE_OBJ_TYPE, id: 'id-4', spaces: [] }; // will be deleted (since it has no spaces, it shouldn't exist)

        const objects = [obj1, obj2, obj3, obj4];
        const spacesToRemove = [space1];
        const params = setup({ objects, spacesToRemove });
        // this test case does not call mget
        mockBulkResults({ error: false }, { error: false }, { error: false }); // results for obj2, obj3, and obj4

        await updateObjectsSpaces(params);
        expect(client.bulk).toHaveBeenCalledTimes(1);
        expectBulkArgs(
          { action: 'update', object: { ...obj2, namespaces: [space2] } },
          { action: 'delete', object: obj3 },
          { action: 'delete', object: obj4 }
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
        const obj1 = { type: SHAREABLE_OBJ_TYPE, id: 'id-1', spaces: [space] }; // will not be updated

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
      const obj4 = { type: SHAREABLE_OBJ_TYPE, id: 'id-4', spaces: [] }; // will be deleted (since it has no spaces, it shouldn't exist)

      const objects = [obj1, obj2, obj3, obj4];
      const spacesToRemove = [space1];
      const params = setup({ objects, spacesToRemove });
      // this test case does not call mget
      mockBulkResults({ error: false }, { error: false }, { error: false }); // results for obj2, obj3, and obj4

      const result = await updateObjectsSpaces(params);
      expect(result.objects).toEqual([
        { ...obj1, spaces: [space2] },
        { ...obj2, spaces: [space2] },
        { ...obj3, spaces: [] },
        { ...obj4, spaces: [] },
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

    it('when the "includeReferences" option is used and extra references are found', async () => {
      const space1 = 'space-to-add';
      const space2 = 'space-to-remove';
      const space3 = 'other-space';
      const obj1 = { type: SHAREABLE_OBJ_TYPE, id: 'id-1', spaces: [space1] }; // will not be changed
      const obj2 = { type: SHAREABLE_OBJ_TYPE, id: 'id-2', spaces: [space3] }; // will be updated to add space1
      const obj3 = { type: SHAREABLE_OBJ_TYPE, id: 'id-3', spaces: [space1, space2] }; // will be updated to remove space2
      const obj4 = { type: SHAREABLE_OBJ_TYPE, id: 'id-4', spaces: [space2, space3] }; // will be updated to add space1 and remove space2

      const objects = [{ type: obj1.type, id: obj1.id }]; // doesn't matter what the input is, when "includeReferences" is enabled, the output of collectMultiNamespaceReferences is used instead
      const spacesToAdd = [space1];
      const spacesToRemove = [space2];
      const options = { includeReferences: true };
      const params = setup({ objects, spacesToAdd, spacesToRemove, options });
      // this test case does not call mget
      params.collectMultiNamespaceReferences.mockResolvedValue({
        objects: [obj1, obj2, obj3, obj4],
      });
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
