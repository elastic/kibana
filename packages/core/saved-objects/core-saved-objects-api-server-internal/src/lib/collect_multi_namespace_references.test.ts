/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  mockFindLegacyUrlAliases,
  mockFindSharedOriginObjects,
  mockRawDocExistsInNamespace,
} from './collect_multi_namespace_references.test.mock';

import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import type {
  SavedObjectsCollectMultiNamespaceReferencesObject,
  SavedObjectsCollectMultiNamespaceReferencesOptions,
} from '@kbn/core-saved-objects-api-server';
import {
  setMapsAreEqual,
  SavedObjectsErrorHelpers,
  setsAreEqual,
} from '@kbn/core-saved-objects-utils-server';
import { SavedObjectsSerializer } from '@kbn/core-saved-objects-base-server-internal';
import { typeRegistryMock } from '@kbn/core-saved-objects-base-server-mocks';
import {
  ALIAS_OR_SHARED_ORIGIN_SEARCH_PER_PAGE,
  type CollectMultiNamespaceReferencesParams,
} from './collect_multi_namespace_references';
import { collectMultiNamespaceReferences } from './collect_multi_namespace_references';
import type { CreatePointInTimeFinderFn } from './point_in_time_finder';
import { AuditAction, type ISavedObjectsSecurityExtension } from '@kbn/core-saved-objects-server';

import {
  authMap,
  enforceError,
  setupPerformAuthFullyAuthorized,
  setupPerformAuthEnforceFailure,
  setupRedactPassthrough,
} from '../test_helpers/repository.test.common';
import { savedObjectsExtensionsMock } from '../mocks/saved_objects_extensions.mock';

const SPACES = ['default', 'another-space'];
const VERSION_PROPS = { _seq_no: 1, _primary_term: 1 };

const MULTI_NAMESPACE_OBJ_TYPE_1 = 'type-a';
const MULTI_NAMESPACE_OBJ_TYPE_2 = 'type-b';
const NON_MULTI_NAMESPACE_OBJ_TYPE = 'type-c';
const MULTI_NAMESPACE_HIDDEN_OBJ_TYPE = 'type-d';

beforeEach(() => {
  mockFindLegacyUrlAliases.mockReset();
  mockFindLegacyUrlAliases.mockResolvedValue(new Map()); // return an empty map by default
  mockFindSharedOriginObjects.mockReset();
  mockFindSharedOriginObjects.mockResolvedValue(new Map()); // return an empty map by default
  mockRawDocExistsInNamespace.mockReset();
  mockRawDocExistsInNamespace.mockReturnValue(true); // return true by default
});

describe('collectMultiNamespaceReferences', () => {
  let client: ReturnType<typeof elasticsearchClientMock.createElasticsearchClient>;

  /** Sets up the type registry, saved objects client, etc. and return the full parameters object to be passed to `collectMultiNamespaceReferences` */
  function setup(
    objects: SavedObjectsCollectMultiNamespaceReferencesObject[],
    options: SavedObjectsCollectMultiNamespaceReferencesOptions = {},
    securityExtension?: ISavedObjectsSecurityExtension | undefined
  ): CollectMultiNamespaceReferencesParams {
    const registry = typeRegistryMock.create();
    registry.isMultiNamespace.mockImplementation(
      (type) =>
        [
          MULTI_NAMESPACE_OBJ_TYPE_1,
          MULTI_NAMESPACE_OBJ_TYPE_2,
          MULTI_NAMESPACE_HIDDEN_OBJ_TYPE,
        ].includes(type) // NON_MULTI_NAMESPACE_TYPE is omitted
    );
    registry.isShareable.mockImplementation(
      (type) => [MULTI_NAMESPACE_OBJ_TYPE_1, MULTI_NAMESPACE_HIDDEN_OBJ_TYPE].includes(type) // MULTI_NAMESPACE_OBJ_TYPE_2 and NON_MULTI_NAMESPACE_TYPE are omitted
    );
    client = elasticsearchClientMock.createElasticsearchClient();
    const serializer = new SavedObjectsSerializer(registry);

    return {
      registry,
      allowedTypes: [
        MULTI_NAMESPACE_OBJ_TYPE_1,
        MULTI_NAMESPACE_OBJ_TYPE_2,
        NON_MULTI_NAMESPACE_OBJ_TYPE,
      ], // MULTI_NAMESPACE_HIDDEN_TYPE is omitted
      client,
      serializer,
      getIndexForType: (type: string) => `index-for-${type}`,
      createPointInTimeFinder: jest.fn() as CreatePointInTimeFinderFn,
      securityExtension,
      objects,
      options,
    };
  }

  /** Mocks the saved objects client so it returns the expected results */
  function mockMgetResults(
    ...results: Array<{
      found: boolean;
      originId?: string;
      references?: Array<{ type: string; id: string }>;
    }>
  ) {
    client.mget.mockResponseOnce({
      docs: results.map((x) => {
        const references =
          x.references?.map(({ type, id }) => ({ type, id, name: 'ref-name' })) ?? [];
        return x.found
          ? {
              _id: 'doesnt-matter',
              _index: 'doesnt-matter',
              _source: {
                namespaces: SPACES,
                originId: x.originId,
                references,
              },
              ...VERSION_PROPS,
              found: true,
            }
          : {
              _id: 'doesnt-matter',
              _index: 'doesnt-matter',
              found: false,
            };
      }),
    });
  }

  /** Asserts that mget is called for the given objects */
  function expectMgetArgs(
    n: number,
    ...objects: SavedObjectsCollectMultiNamespaceReferencesObject[]
  ) {
    const docs = objects.map(({ type, id }) => expect.objectContaining({ _id: `${type}:${id}` }));
    expect(client.mget).toHaveBeenNthCalledWith(n, { body: { docs } }, expect.anything());
  }

  it('returns an empty array if no object args are passed in', async () => {
    const params = setup([]);

    const result = await collectMultiNamespaceReferences(params);
    expect(client.mget).not.toHaveBeenCalled();
    expect(result.objects).toEqual([]);
  });

  it('excludes args that have unsupported types', async () => {
    const obj1 = { type: MULTI_NAMESPACE_OBJ_TYPE_1, id: 'id-1' };
    const obj2 = { type: NON_MULTI_NAMESPACE_OBJ_TYPE, id: 'id-2' };
    const obj3 = { type: MULTI_NAMESPACE_HIDDEN_OBJ_TYPE, id: 'id-3' };
    const params = setup([obj1, obj2, obj3]);
    mockMgetResults({ found: true }); // results for obj1

    const result = await collectMultiNamespaceReferences(params);
    expect(client.mget).toHaveBeenCalledTimes(1);
    expectMgetArgs(1, obj1); // the non-multi-namespace type and the hidden type are excluded
    expect(result.objects).toEqual([
      { ...obj1, spaces: SPACES, inboundReferences: [] },
      // even though they are excluded from the cluster call, obj2 and obj3 are included in the results
      { ...obj2, spaces: [], inboundReferences: [] },
      { ...obj3, spaces: [], inboundReferences: [] },
    ]);
  });

  it('excludes references that have unsupported types', async () => {
    const obj1 = { type: MULTI_NAMESPACE_OBJ_TYPE_1, id: 'id-1' };
    const obj2 = { type: NON_MULTI_NAMESPACE_OBJ_TYPE, id: 'id-2' };
    const obj3 = { type: MULTI_NAMESPACE_HIDDEN_OBJ_TYPE, id: 'id-3' };
    const params = setup([obj1]);
    mockMgetResults({ found: true, references: [obj2, obj3] }); // results for obj1

    const result = await collectMultiNamespaceReferences(params);
    expect(client.mget).toHaveBeenCalledTimes(1);
    expectMgetArgs(1, obj1);
    // obj2 and obj3 are not retrieved in a second cluster call
    expect(result.objects).toEqual([
      { ...obj1, spaces: SPACES, inboundReferences: [] },
      // obj2 and obj3 are excluded from the results
    ]);
  });

  it('handles circular references', async () => {
    const obj1 = { type: MULTI_NAMESPACE_OBJ_TYPE_1, id: 'id-1' };
    const params = setup([obj1]);
    mockMgetResults({ found: true, references: [obj1] }); // results for obj1

    const result = await collectMultiNamespaceReferences(params);
    expect(params.client.mget).toHaveBeenCalledTimes(1);
    expectMgetArgs(1, obj1); // obj1 is retrieved once, and it is not retrieved again in a second cluster call
    expect(result.objects).toEqual([
      { ...obj1, spaces: SPACES, inboundReferences: [{ ...obj1, name: 'ref-name' }] }, // obj1 reflects the inbound reference to itself
    ]);
  });

  it('handles a reference graph more than 20 layers deep (circuit-breaker)', async () => {
    const type = MULTI_NAMESPACE_OBJ_TYPE_1;
    const params = setup([{ type, id: 'id-1' }]);
    for (let i = 1; i < 100; i++) {
      mockMgetResults({ found: true, references: [{ type, id: `id-${i + 1}` }] });
    }

    await expect(() => collectMultiNamespaceReferences(params)).rejects.toThrow(
      /Exceeded maximum reference graph depth/
    );
    expect(params.client.mget).toHaveBeenCalledTimes(20);
  });

  it('handles multiple inbound references', async () => {
    const obj1 = { type: MULTI_NAMESPACE_OBJ_TYPE_1, id: 'id-1' };
    const obj2 = { type: MULTI_NAMESPACE_OBJ_TYPE_1, id: 'id-2' };
    const obj3 = { type: MULTI_NAMESPACE_OBJ_TYPE_1, id: 'id-3' };
    const params = setup([obj1, obj2]);
    mockMgetResults({ found: true, references: [obj3] }, { found: true, references: [obj3] }); // results for obj1 and obj2
    mockMgetResults({ found: true }); // results for obj3

    const result = await collectMultiNamespaceReferences(params);
    expect(params.client.mget).toHaveBeenCalledTimes(2);
    expectMgetArgs(1, obj1, obj2);
    expectMgetArgs(2, obj3); // obj3 is retrieved in a second cluster call
    expect(result.objects).toEqual([
      { ...obj1, spaces: SPACES, inboundReferences: [] },
      { ...obj2, spaces: SPACES, inboundReferences: [] },
      {
        ...obj3,
        spaces: SPACES,
        inboundReferences: [
          // obj3 reflects both inbound references
          { ...obj1, name: 'ref-name' },
          { ...obj2, name: 'ref-name' },
        ],
      },
    ]);
  });

  it('handles transitive references', async () => {
    const obj1 = { type: MULTI_NAMESPACE_OBJ_TYPE_1, id: 'id-1' };
    const obj2 = { type: MULTI_NAMESPACE_OBJ_TYPE_1, id: 'id-2' };
    const obj3 = { type: MULTI_NAMESPACE_OBJ_TYPE_1, id: 'id-3' };
    const params = setup([obj1]);
    mockMgetResults({ found: true, references: [obj2] }); // results for obj1
    mockMgetResults({ found: true, references: [obj3] }); // results for obj2
    mockMgetResults({ found: true }); // results for obj3

    const result = await collectMultiNamespaceReferences(params);
    expect(params.client.mget).toHaveBeenCalledTimes(3);
    expectMgetArgs(1, obj1);
    expectMgetArgs(2, obj2); // obj2 is retrieved in a second cluster call
    expectMgetArgs(3, obj3); // obj3 is retrieved in a third cluster call
    expect(result.objects).toEqual([
      { ...obj1, spaces: SPACES, inboundReferences: [] },
      { ...obj2, spaces: SPACES, inboundReferences: [{ ...obj1, name: 'ref-name' }] }, // obj2 reflects the inbound reference
      { ...obj3, spaces: SPACES, inboundReferences: [{ ...obj2, name: 'ref-name' }] }, // obj3 reflects the inbound reference
    ]);
  });

  it('handles missing objects and missing references', async () => {
    const obj1 = { type: MULTI_NAMESPACE_OBJ_TYPE_1, id: 'id-1' }; // found, with missing references to obj4 and obj5
    const obj2 = { type: MULTI_NAMESPACE_OBJ_TYPE_1, id: 'id-2' }; // missing object (found, but doesn't exist in the current space))
    const obj3 = { type: MULTI_NAMESPACE_OBJ_TYPE_1, id: 'id-3' }; // missing object (not found
    const obj4 = { type: MULTI_NAMESPACE_OBJ_TYPE_1, id: 'id-4' }; // missing reference (found but doesn't exist in the current space)
    const obj5 = { type: MULTI_NAMESPACE_OBJ_TYPE_1, id: 'id-5' }; // missing reference (not found)
    const params = setup([obj1, obj2, obj3]);
    mockMgetResults({ found: true, references: [obj4, obj5] }, { found: true }, { found: false }); // results for obj1, obj2, and obj3
    mockMgetResults({ found: true }, { found: false }); // results for obj4 and obj5
    mockRawDocExistsInNamespace.mockReturnValueOnce(true); // for obj1
    mockRawDocExistsInNamespace.mockReturnValueOnce(false); // for obj2
    mockRawDocExistsInNamespace.mockReturnValueOnce(false); // for obj4

    const result = await collectMultiNamespaceReferences(params);
    expect(params.client.mget).toHaveBeenCalledTimes(2);
    expectMgetArgs(1, obj1, obj2, obj3);
    expectMgetArgs(2, obj4, obj5);
    expect(mockRawDocExistsInNamespace).toHaveBeenCalledTimes(3);
    expect(result.objects).toEqual([
      { ...obj1, spaces: SPACES, inboundReferences: [] },
      { ...obj2, spaces: [], inboundReferences: [], isMissing: true },
      { ...obj3, spaces: [], inboundReferences: [], isMissing: true },
      { ...obj4, spaces: [], inboundReferences: [{ ...obj1, name: 'ref-name' }], isMissing: true },
      { ...obj5, spaces: [], inboundReferences: [{ ...obj1, name: 'ref-name' }], isMissing: true },
    ]);
  });

  it('handles the purpose="updateObjectsSpaces" option', async () => {
    const obj1 = { type: MULTI_NAMESPACE_OBJ_TYPE_1, id: 'id-1' };
    const obj2 = { type: MULTI_NAMESPACE_OBJ_TYPE_2, id: 'id-2' };
    const obj3 = { type: MULTI_NAMESPACE_OBJ_TYPE_2, id: 'id-3' };
    const params = setup([obj1, obj2], { purpose: 'updateObjectsSpaces' });
    mockMgetResults({ found: true, references: [obj3] }); // results for obj1

    const result = await collectMultiNamespaceReferences(params);
    expect(client.mget).toHaveBeenCalledTimes(1);
    expectMgetArgs(1, obj1); // obj2 is excluded
    // obj3 is not retrieved in a second cluster call
    expect(result.objects).toEqual([
      { ...obj1, spaces: SPACES, inboundReferences: [] },
      // even though it is excluded from the cluster call, obj2 is included in the results
      { ...obj2, spaces: [], inboundReferences: [] },
      // obj3 is excluded from the results
    ]);
  });

  it(`handles 404 responses that don't come from Elasticsearch`, async () => {
    const createEsUnavailableNotFoundError = () => {
      return SavedObjectsErrorHelpers.createGenericNotFoundEsUnavailableError();
    };
    const obj1 = { type: MULTI_NAMESPACE_OBJ_TYPE_1, id: 'id-1' };
    const params = setup([obj1]);
    client.mget.mockReturnValueOnce(
      elasticsearchClientMock.createSuccessTransportRequestPromise(
        { docs: [] },
        { statusCode: 404 },
        {}
      )
    );
    await expect(() => collectMultiNamespaceReferences(params)).rejects.toThrowError(
      createEsUnavailableNotFoundError()
    );
  });

  describe('legacy URL aliases', () => {
    it('uses findLegacyUrlAliases to search for legacy URL aliases', async () => {
      const obj1 = { type: MULTI_NAMESPACE_OBJ_TYPE_1, id: 'id-1' };
      const obj2 = { type: MULTI_NAMESPACE_OBJ_TYPE_1, id: 'id-2' };
      const obj3 = { type: MULTI_NAMESPACE_OBJ_TYPE_1, id: 'id-3' };
      const params = setup([obj1, obj2], {});
      mockMgetResults({ found: true, references: [obj3] }, { found: true, references: [] }); // results for obj1 and obj2
      mockMgetResults({ found: true, references: [] }); // results for obj3
      mockFindLegacyUrlAliases.mockResolvedValue(
        new Map([
          [`${obj1.type}:${obj1.id}`, new Set(['space-1', 'space-2', 'space-3', 'space-4'])],
          // the result map does not contain keys for obj2 or obj3 because we did not find any aliases for those objects
        ])
      );

      const result = await collectMultiNamespaceReferences(params);
      expect(client.mget).toHaveBeenCalledTimes(2);
      expectMgetArgs(1, obj1, obj2);
      expectMgetArgs(2, obj3); // obj3 is retrieved in a second cluster call
      expect(mockFindLegacyUrlAliases).toHaveBeenCalledTimes(1);
      expect(mockFindLegacyUrlAliases).toHaveBeenCalledWith(
        expect.anything(),
        [obj1, obj2, obj3],
        ALIAS_OR_SHARED_ORIGIN_SEARCH_PER_PAGE
      );
      expect(result.objects).toEqual([
        {
          ...obj1,
          spaces: SPACES,
          inboundReferences: [],
          spacesWithMatchingAliases: ['space-1', 'space-2', 'space-3', 'space-4'],
        },
        { ...obj2, spaces: SPACES, inboundReferences: [] },
        { ...obj3, spaces: SPACES, inboundReferences: [{ ...obj1, name: 'ref-name' }] },
      ]);
    });

    it('omits objects that have an empty spaces array (the object does not exist, or we are not sure)', async () => {
      const obj1 = { type: MULTI_NAMESPACE_OBJ_TYPE_1, id: 'id-1' };
      const obj2 = { type: MULTI_NAMESPACE_OBJ_TYPE_1, id: 'id-2' };
      const params = setup([obj1, obj2]);
      mockMgetResults({ found: true }, { found: false }); // results for obj1 and obj2

      await collectMultiNamespaceReferences(params);
      expect(mockFindLegacyUrlAliases).toHaveBeenCalledTimes(1);
      expect(mockFindLegacyUrlAliases).toHaveBeenCalledWith(
        expect.anything(),
        [obj1],
        ALIAS_OR_SHARED_ORIGIN_SEARCH_PER_PAGE
      );
    });

    it('handles findLegacyUrlAliases errors', async () => {
      const obj1 = { type: MULTI_NAMESPACE_OBJ_TYPE_1, id: 'id-1' };
      const params = setup([obj1]);
      mockMgetResults({ found: true }); // results for obj1
      mockFindLegacyUrlAliases.mockRejectedValue(
        new Error('Failed to retrieve legacy URL aliases: Oh no!')
      );

      await expect(() => collectMultiNamespaceReferences(params)).rejects.toThrow(
        'Failed to retrieve legacy URL aliases: Oh no!'
      );
    });
  });

  describe('shared origins', () => {
    it('uses findSharedOriginObjects to search for objects with shared origins', async () => {
      const obj1 = { type: MULTI_NAMESPACE_OBJ_TYPE_1, id: 'id-1' };
      const obj2 = { type: MULTI_NAMESPACE_OBJ_TYPE_1, id: 'id-x', originId: 'id-2' };
      const obj3 = { type: MULTI_NAMESPACE_OBJ_TYPE_1, id: 'id-3' };
      const params = setup([obj1, obj2], {});
      mockMgetResults(
        // results for obj1 and obj2
        { found: true, references: [obj3] },
        { found: true, originId: obj2.originId, references: [] }
      );
      mockMgetResults({ found: true, references: [] }); // results for obj3
      mockFindSharedOriginObjects.mockResolvedValue(
        new Map([
          [`${obj1.type}:${obj1.id}`, new Set(['space-1'])],
          [`${obj2.type}:${obj2.originId}`, new Set(['*'])],
          [`${obj3.type}:${obj3.id}`, new Set(['space-1', 'space-2'])],
        ])
      );

      const result = await collectMultiNamespaceReferences(params);
      expect(client.mget).toHaveBeenCalledTimes(2);
      expectMgetArgs(1, obj1, obj2);
      expectMgetArgs(2, obj3); // obj3 is retrieved in a second cluster call
      expect(mockFindSharedOriginObjects).toHaveBeenCalledTimes(1);
      expect(mockFindSharedOriginObjects).toHaveBeenCalledWith(
        expect.anything(),
        [
          { type: obj1.type, origin: obj1.id },
          { type: obj2.type, origin: obj2.originId }, // If the found object has an `originId`, that is used instead of the object's `id`.
          { type: obj3.type, origin: obj3.id },
        ],
        ALIAS_OR_SHARED_ORIGIN_SEARCH_PER_PAGE
      );
      expect(result.objects).toEqual([
        // Note: in a realistic scenario, `spacesWithMatchingOrigins` would be a superset of `spaces`. But for the purposes of this unit
        // test, it doesn't matter if they are different.
        { ...obj1, spaces: SPACES, inboundReferences: [], spacesWithMatchingOrigins: ['space-1'] },
        { ...obj2, spaces: SPACES, inboundReferences: [], spacesWithMatchingOrigins: ['*'] },
        {
          ...obj3,
          spaces: SPACES,
          inboundReferences: [{ ...obj1, name: 'ref-name' }],
          spacesWithMatchingOrigins: ['space-1', 'space-2'],
        },
      ]);
    });

    it('omits objects that have an empty spaces array (the object does not exist, or we are not sure)', async () => {
      const obj1 = { type: MULTI_NAMESPACE_OBJ_TYPE_1, id: 'id-1' };
      const obj2 = { type: MULTI_NAMESPACE_OBJ_TYPE_1, id: 'id-2' };
      const params = setup([obj1, obj2]);
      mockMgetResults({ found: true }, { found: false }); // results for obj1 and obj2

      await collectMultiNamespaceReferences(params);
      expect(mockFindSharedOriginObjects).toHaveBeenCalledTimes(1);
      expect(mockFindSharedOriginObjects).toHaveBeenCalledWith(
        expect.anything(),
        [{ type: obj1.type, origin: obj1.id }],
        ALIAS_OR_SHARED_ORIGIN_SEARCH_PER_PAGE
      );
    });

    it('handles findSharedOriginObjects errors', async () => {
      const obj1 = { type: MULTI_NAMESPACE_OBJ_TYPE_1, id: 'id-1' };
      const params = setup([obj1]);
      mockMgetResults({ found: true }); // results for obj1
      mockFindSharedOriginObjects.mockRejectedValue(
        new Error('Failed to retrieve shared origin objects: Oh no!')
      );

      await expect(() => collectMultiNamespaceReferences(params)).rejects.toThrow(
        'Failed to retrieve shared origin objects: Oh no!'
      );
    });
  });

  describe('with security enabled', () => {
    const mockSecurityExt = savedObjectsExtensionsMock.createSecurityExtension();
    const obj1 = { type: MULTI_NAMESPACE_OBJ_TYPE_1, id: 'id-1' };
    const obj2 = { type: MULTI_NAMESPACE_OBJ_TYPE_1, id: 'id-2' };
    const obj3 = { type: MULTI_NAMESPACE_OBJ_TYPE_1, id: 'id-3' };
    const objects = [obj1, obj2];
    const obj1LegacySpaces = ['space-1', 'space-2', 'space-3', 'space-4'];
    let params: CollectMultiNamespaceReferencesParams;

    beforeEach(() => {
      params = setup([obj1, obj2], {}, mockSecurityExt);
      mockMgetResults({ found: true, references: [obj3] }, { found: true, references: [] }); // results for obj1 and obj2
      mockMgetResults({ found: true, references: [] }); // results for obj3
      mockFindLegacyUrlAliases.mockResolvedValue(
        new Map([
          [`${obj1.type}:${obj1.id}`, new Set(obj1LegacySpaces)],
          // the result map does not contain keys for obj2 or obj3 because we did not find any aliases for those objects
        ])
      );
    });

    afterEach(() => {
      mockSecurityExt.performAuthorization.mockReset();
      mockSecurityExt.enforceAuthorization.mockReset();
      mockSecurityExt.redactNamespaces.mockReset();
      mockSecurityExt.addAuditEvent.mockReset();
    });

    describe(`errors`, () => {
      test(`propagates decorated error when not authorized`, async () => {
        // Unlike other functions, it doesn't validate the level of authorization first, so we need to
        // carry on and mock the enforce function as well to create an unauthorized condition
        setupPerformAuthEnforceFailure(mockSecurityExt);

        await expect(collectMultiNamespaceReferences(params)).rejects.toThrow(enforceError);
        expect(mockSecurityExt.performAuthorization).toHaveBeenCalledTimes(1);
      });

      test(`adds audit event per object when not successful`, async () => {
        // Unlike other functions, it doesn't validate the level of authorization first, so we need to
        // carry on and mock the enforce function as well to create an unauthorized condition
        setupPerformAuthEnforceFailure(mockSecurityExt);

        await expect(collectMultiNamespaceReferences(params)).rejects.toThrow(enforceError);
        expect(mockSecurityExt.performAuthorization).toHaveBeenCalledTimes(1);

        expect(mockSecurityExt.addAuditEvent).toHaveBeenCalledTimes(objects.length);
        objects.forEach((obj) => {
          expect(mockSecurityExt.addAuditEvent).toHaveBeenCalledWith({
            action: AuditAction.COLLECT_MULTINAMESPACE_REFERENCES,
            savedObject: { type: obj.type, id: obj.id },
            error: enforceError,
          });
        });
      });
    });

    describe('checks privileges', () => {
      beforeEach(() => {
        setupPerformAuthEnforceFailure(mockSecurityExt);
      });
      test(`in the default state`, async () => {
        await expect(collectMultiNamespaceReferences(params)).rejects.toThrow(enforceError);

        expect(mockSecurityExt.performAuthorization).toHaveBeenCalledTimes(1);
        const expectedSpaces = new Set(['default', ...SPACES, ...obj1LegacySpaces]);
        const expectedEnforceMap = new Map([[objects[0].type, new Set(['default'])]]);

        const { spaces: actualSpaces, enforceMap: actualEnforceMap } =
          mockSecurityExt.performAuthorization.mock.calls[0][0];
        expect(setsAreEqual(actualSpaces, expectedSpaces)).toBeTruthy();
        expect(setMapsAreEqual(actualEnforceMap, expectedEnforceMap)).toBeTruthy();
      });

      test(`in a non-default state`, async () => {
        const namespace = 'space-X';
        await expect(
          collectMultiNamespaceReferences({ ...params, options: { namespace } })
        ).rejects.toThrow(enforceError);

        expect(mockSecurityExt.performAuthorization).toHaveBeenCalledTimes(1);
        const expectedSpaces = new Set([namespace, ...SPACES, ...obj1LegacySpaces]);
        const expectedEnforceMap = new Map([[objects[0].type, new Set([namespace])]]);
        const { spaces: actualSpaces, enforceMap: actualEnforceMap } =
          mockSecurityExt.performAuthorization.mock.calls[0][0];
        expect(setsAreEqual(actualSpaces, expectedSpaces)).toBeTruthy();
        expect(setMapsAreEqual(actualEnforceMap, expectedEnforceMap)).toBeTruthy();
      });

      test(`with purpose 'collectMultiNamespaceReferences'`, async () => {
        const options: SavedObjectsCollectMultiNamespaceReferencesOptions = {
          purpose: 'collectMultiNamespaceReferences',
        };

        setupPerformAuthEnforceFailure(mockSecurityExt);

        await expect(collectMultiNamespaceReferences({ ...params, options })).rejects.toThrow(
          enforceError
        );
        expect(mockSecurityExt.performAuthorization).toHaveBeenCalledTimes(1);
        expect(mockSecurityExt.performAuthorization).toBeCalledWith(
          expect.objectContaining({
            actions: new Set(['bulk_get']),
          })
        );
      });

      test(`with purpose 'updateObjectsSpaces'`, async () => {
        const options: SavedObjectsCollectMultiNamespaceReferencesOptions = {
          purpose: 'updateObjectsSpaces',
        };

        setupPerformAuthEnforceFailure(mockSecurityExt);

        await expect(collectMultiNamespaceReferences({ ...params, options })).rejects.toThrow(
          enforceError
        );
        expect(mockSecurityExt.performAuthorization).toHaveBeenCalledTimes(1);
        expect(mockSecurityExt.performAuthorization).toBeCalledWith(
          expect.objectContaining({
            actions: new Set(['share_to_space']),
          })
        );
      });
    });

    describe('success', () => {
      beforeEach(async () => {
        setupPerformAuthFullyAuthorized(mockSecurityExt);
        setupRedactPassthrough(mockSecurityExt);
        await collectMultiNamespaceReferences(params);
      });
      test(`calls redactNamespaces with type, spaces, and authorization map`, async () => {
        expect(mockSecurityExt.performAuthorization).toHaveBeenCalledTimes(1);
        const expectedSpaces = new Set(['default', ...SPACES, ...obj1LegacySpaces]);
        const { spaces: actualSpaces } = mockSecurityExt.performAuthorization.mock.calls[0][0];
        expect(setsAreEqual(actualSpaces, expectedSpaces)).toBeTruthy();

        const resultObjects = [obj1, obj2, obj3];

        // enforce is called once for all objects/spaces, then once per object
        expect(mockSecurityExt.enforceAuthorization).toHaveBeenCalledTimes(resultObjects.length);
        const expectedTypesAndSpaces = new Map([[objects[0].type, new Set(['default'])]]);
        const { typesAndSpaces: actualTypesAndSpaces } =
          mockSecurityExt.enforceAuthorization.mock.calls[0][0];
        expect(setMapsAreEqual(actualTypesAndSpaces, expectedTypesAndSpaces)).toBeTruthy();

        // Redact is called once per object, but an additional time for object 1 because it has legacy URL aliases in another set of spaces
        expect(mockSecurityExt.redactNamespaces).toBeCalledTimes(resultObjects.length + 1);
        const expectedRedactParams = [
          { type: obj1.type, spaces: SPACES },
          { type: obj1.type, spaces: obj1LegacySpaces },
          { type: obj2.type, spaces: SPACES },
          { type: obj3.type, spaces: SPACES },
        ];

        expectedRedactParams.forEach((expected, i) => {
          const { savedObject, typeMap } = mockSecurityExt.redactNamespaces.mock.calls[i][0];
          expect(savedObject).toEqual(
            expect.objectContaining({
              type: expected.type,
              namespaces: expected.spaces,
            })
          );
          expect(typeMap).toBe(authMap);
        });
      });

      test(`adds audit event per object when successful`, async () => {
        expect(mockSecurityExt.performAuthorization).toHaveBeenCalledTimes(1);

        const resultObjects = [obj1, obj2, obj3];

        expect(mockSecurityExt.addAuditEvent).toHaveBeenCalledTimes(resultObjects.length);
        resultObjects.forEach((obj) => {
          expect(mockSecurityExt.addAuditEvent).toHaveBeenCalledWith({
            action: AuditAction.COLLECT_MULTINAMESPACE_REFERENCES,
            savedObject: { type: obj.type, id: obj.id },
            error: undefined,
          });
        });
      });
    });
  });
});
