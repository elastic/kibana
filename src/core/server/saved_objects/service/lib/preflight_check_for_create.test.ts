/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  mockFindLegacyUrlAliases,
  mockRawDocExistsInNamespaces,
} from './preflight_check_for_create.test.mock';

import type { DeeplyMockedKeys } from '@kbn/utility-types/jest';

import type { ElasticsearchClient } from '../../../elasticsearch';
import { elasticsearchClientMock } from '../../../elasticsearch/client/mocks';
import { LEGACY_URL_ALIAS_TYPE } from '../../object_types';
import { typeRegistryMock } from '../../saved_objects_type_registry.mock';
import { SavedObjectsSerializer } from '../../serialization';
import type { CreatePointInTimeFinderFn } from './point_in_time_finder';
import {
  ALIAS_SEARCH_PER_PAGE,
  PreflightCheckForCreateObject,
  PreflightCheckForCreateParams,
} from './preflight_check_for_create';
import { preflightCheckForCreate } from './preflight_check_for_create';

beforeEach(() => {
  mockFindLegacyUrlAliases.mockReset();
  mockFindLegacyUrlAliases.mockResolvedValue(new Map()); // return an empty map by default
  mockRawDocExistsInNamespaces.mockReset();
  mockRawDocExistsInNamespaces.mockReturnValue(true); // return true by default
});

describe('preflightCheckForCreate', () => {
  let client: DeeplyMockedKeys<ElasticsearchClient>;

  function setup(...objects: PreflightCheckForCreateObject[]): PreflightCheckForCreateParams {
    const registry = typeRegistryMock.create();
    client = elasticsearchClientMock.createElasticsearchClient();
    const serializer = new SavedObjectsSerializer(registry);
    return {
      registry,
      client,
      serializer,
      getIndexForType: (type: string) => `index-for-${type}`,
      createPointInTimeFinder: jest.fn() as CreatePointInTimeFinderFn,
      objects,
    };
  }

  /** Mocks the saved objects client so it returns the expected results */
  function mockMgetResults(
    ...results: Array<{
      found: boolean;
      disabled?: boolean; // only used for alias results
    }>
  ) {
    // instead of just mocking the response, we need to mock the implementation so we can correctly set the _id in the response docs
    client.mget.mockImplementation((params, _options) => {
      return elasticsearchClientMock.createSuccessTransportRequestPromise({
        docs: results.map(({ found, disabled }, i) => {
          return found
            ? {
                // @ts-expect-error
                _id: params!.body!.docs![i]._id as string, // needed for mockRawDocExistsInNamespaces mock implementation and existingDocument assertions
                _index: 'doesnt-matter',
                _source: {
                  ...(disabled !== undefined && { [LEGACY_URL_ALIAS_TYPE]: { disabled } }),
                },
                found: true,
              }
            : {
                _id: 'doesnt-matter',
                _index: 'doesnt-matter',
                found: false,
              };
        }),
      });
    });
  }

  /** Asserts that mget is called for the given raw object IDs */
  function expectMgetArgs(...rawObjectIds: string[]) {
    const docs = rawObjectIds.map((_id) => expect.objectContaining({ _id }));
    expect(client.mget).toHaveBeenCalledWith({ body: { docs } }, expect.anything());
  }

  /** Asserts that findLegacyUrlAliases is called for the given objects */
  function expectFindArgs(...objects: Array<{ type: string; id: string }>) {
    expect(mockFindLegacyUrlAliases).toHaveBeenCalledWith(
      expect.anything(),
      objects.map(({ type, id }) => ({ type, id })),
      ALIAS_SEARCH_PER_PAGE
    );
  }

  it(`doesn't call mget if no object args are passed in`, async () => {
    const params = setup();

    await preflightCheckForCreate(params);
    expectFindArgs(); // it *does* call findLegacyUrlAliases, but it's intentional beause that module handles an empty object array gracefully
    expect(client.mget).not.toHaveBeenCalled();
  });

  it(`uses find instead of mget when exceeding the alias threshold`, async () => {
    const fourSpaces = ['a', 'b', 'c', 'd'];
    const obj1 = { type: 'obj-type', id: 'id-1', overwrite: false, namespaces: ['a'] }; // mget aliases
    const obj2 = { type: 'obj-type', id: 'id-2', overwrite: false, namespaces: ['*'] }; // find aliases because it exists in all spaces
    const obj3 = { type: 'obj-type', id: 'id-3', overwrite: false, namespaces: ['a', 'b', 'c'] }; // mget aliases
    const obj4 = { type: 'obj-type', id: 'id-4', overwrite: false, namespaces: fourSpaces }; // find aliases because it exists in 4 spaces (the threshold is 3)
    const params = setup(obj1, obj2, obj3, obj4);
    mockMgetResults(...new Array(8).fill({ found: false }));
    await preflightCheckForCreate(params);

    expectFindArgs(obj2, obj4);
    expectMgetArgs(
      `${obj1.type}:${obj1.id}`,
      `${LEGACY_URL_ALIAS_TYPE}:a:${obj1.type}:${obj1.id}`,
      `${obj2.type}:${obj2.id}`,
      // we already searched for aliases for obj2 above, so we don't do it again during mget
      `${obj3.type}:${obj3.id}`,
      `${LEGACY_URL_ALIAS_TYPE}:a:${obj3.type}:${obj3.id}`,
      `${LEGACY_URL_ALIAS_TYPE}:b:${obj3.type}:${obj3.id}`,
      `${LEGACY_URL_ALIAS_TYPE}:c:${obj3.type}:${obj3.id}`,
      `${obj4.type}:${obj4.id}`
      // we already searched for aliases for obj4 above, so we don't do it again during mget
    );
  });

  it(`returns mix of success and error results`, async () => {
    const fourSpaces = ['a', 'b', 'c', 'd'];
    const obj1 = { type: 'obj-type', id: 'id-1', overwrite: false, namespaces: ['*'] }; // success: find aliases, object not found
    const obj2 = { type: 'obj-type', id: 'id-2', overwrite: true, namespaces: fourSpaces }; // success: find aliases, object found
    const obj3 = { type: 'obj-type', id: 'id-3', overwrite: false, namespaces: ['a'] }; // success: mget aliases, object not found
    const obj4 = { type: 'obj-type', id: 'id-4', overwrite: true, namespaces: ['a'] }; // success: mget aliases, object found
    const obj5 = { type: 'obj-type', id: 'id-5', overwrite: true, namespaces: ['*'] }; // error: find aliases, alias conflict (1)
    const obj6 = { type: 'obj-type', id: 'id-6', overwrite: true, namespaces: fourSpaces }; // error: find aliases, alias conflict (2)
    const obj7 = { type: 'obj-type', id: 'id-7', overwrite: true, namespaces: ['a'] }; // error: mget aliases, alias conflict
    const obj8 = { type: 'obj-type', id: 'id-8', overwrite: true, namespaces: fourSpaces }; // error: find aliases, unresolvable conflict
    const obj9 = { type: 'obj-type', id: 'id-9', overwrite: true, namespaces: ['a'] }; // error: mget aliases, unresolvable conflict
    const obj10 = { type: 'obj-type', id: 'id-10', overwrite: false, namespaces: fourSpaces }; // error: find aliases, regular conflict
    const obj11 = { type: 'obj-type', id: 'id-11', overwrite: false, namespaces: ['a'] }; // error: mget aliases, regular conflict

    const params = setup(obj1, obj2, obj3, obj4, obj5, obj6, obj7, obj8, obj9, obj10, obj11);
    mockFindLegacyUrlAliases.mockResolvedValue(
      new Map([
        // did not find aliases for obj1
        [`${obj2.type}:${obj2.id}`, new Set(['e'])], // found an alias for obj2, but it is not in the requested spaces, no problem
        [`${obj5.type}:${obj5.id}`, new Set(['e'])], // found an alias for obj5, and obj5 should be created in all spaces -> this causes an alias conflict
        [`${obj6.type}:${obj6.id}`, new Set(['b'])], // found an alias for obj6, and obj6 should be created in the same space ->  this causes an alias conflict
        // did not find aliases for obj8 or obj10
      ])
    );
    mockMgetResults(
      { found: false }, // did not find obj1
      { found: true }, // found obj2, but it has overwrite enabled, no problem
      { found: false }, // did not find obj3
      { found: false }, // did not find obj3 alias in "a"
      { found: true }, // found obj4
      { found: true, disabled: true }, // found obj4 alias in "a", but it is disabled, no problem
      // we do not mget obj5 or obj6 because they had alias conflicts from the earlier find operation
      { found: true }, // found obj7, but it has overwrite enabled, no problem
      { found: true, disabled: false }, // found obj7 alias in "a" -> this causes an alias conflict
      { found: true }, // found obj8
      // we do not mget aliases for obj8 because we used find for those
      { found: true }, // found obj9
      { found: false }, // did not find obj9 alias in "a"
      { found: true }, // found obj10 -> this causes a regular conflict
      // we do not mget aliases for obj10 because we used find for those
      { found: true }, // found obj11 -> this causes a regular conflict
      { found: false } // did not find obj11 alias in "a"
    );
    mockRawDocExistsInNamespaces.mockImplementation((_registry, { _id }, _namespaces) => {
      return _id !== `${obj8.type}:${obj8.id}` && _id !== `${obj9.type}:${obj9.id}`; // only obj8 and obj9 exist outside of the given spaces
    });
    const result = await preflightCheckForCreate(params);

    expectFindArgs(obj1, obj2, obj5, obj6, obj8, obj10);
    expectMgetArgs(
      `${obj1.type}:${obj1.id}`,
      // we already searched for aliases for obj1 above, so we don't do it again during mget
      `${obj2.type}:${obj2.id}`,
      // we already searched for aliases for obj2 above, so we don't do it again during mget
      `${obj3.type}:${obj3.id}`,
      `${LEGACY_URL_ALIAS_TYPE}:a:${obj3.type}:${obj3.id}`,
      `${obj4.type}:${obj4.id}`,
      `${LEGACY_URL_ALIAS_TYPE}:a:${obj4.type}:${obj4.id}`,
      // we do not mget obj5 or obj6 because they had alias conflicts from the earlier find operation
      `${obj7.type}:${obj7.id}`,
      `${LEGACY_URL_ALIAS_TYPE}:a:${obj7.type}:${obj7.id}`,
      `${obj8.type}:${obj8.id}`,
      // we already searched for aliases for obj8 above, so we don't do it again during mget
      `${obj9.type}:${obj9.id}`,
      `${LEGACY_URL_ALIAS_TYPE}:a:${obj9.type}:${obj9.id}`,
      `${obj10.type}:${obj10.id}`,
      // we already searched for aliases for obj10 above, so we don't do it again during mget
      `${obj11.type}:${obj11.id}`,
      `${LEGACY_URL_ALIAS_TYPE}:a:${obj9.type}:${obj11.id}`
    );
    expect(result).toEqual([
      // Success results: obj2 and obj4 include the existingDocument field because those objects were found
      { type: obj1.type, id: obj1.id },
      {
        type: obj2.type,
        id: obj2.id,
        existingDocument: expect.objectContaining({ _id: `${obj2.type}:${obj2.id}` }),
      },
      { type: obj3.type, id: obj3.id },
      {
        type: obj4.type,
        id: obj4.id,
        existingDocument: expect.objectContaining({ _id: `${obj4.type}:${obj4.id}` }),
      },
      // Error results
      {
        type: obj5.type,
        id: obj5.id,
        error: { type: 'aliasConflict', metadata: { spacesWithConflictingAliases: ['e'] } },
      },
      {
        type: obj6.type,
        id: obj6.id,
        error: { type: 'aliasConflict', metadata: { spacesWithConflictingAliases: ['b'] } },
      },
      {
        type: obj7.type,
        id: obj7.id,
        error: { type: 'aliasConflict', metadata: { spacesWithConflictingAliases: ['a'] } },
      },
      {
        type: obj8.type,
        id: obj8.id,
        error: { type: 'unresolvableConflict', metadata: { isNotOverwritable: true } },
      },
      {
        type: obj9.type,
        id: obj9.id,
        error: { type: 'unresolvableConflict', metadata: { isNotOverwritable: true } },
      },
      { type: obj10.type, id: obj10.id, error: { type: 'conflict' } },
      { type: obj11.type, id: obj11.id, error: { type: 'conflict' } },
    ]);
  });
});
