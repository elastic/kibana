/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { typeRegistryMock } from '@kbn/core-saved-objects-base-server-mocks';

import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';

import { loggerMock } from '@kbn/logging-mocks';
import { ISavedObjectsSecurityExtension } from '@kbn/core-saved-objects-server';
import { SavedObjectsSerializer } from '@kbn/core-saved-objects-base-server-internal';
import {
  type ChangeAccessControlParams,
  changeObjectAccessControl,
} from './change_object_access_control';
import { mockGetBulkOperationError } from './update_objects_spaces.test.mock';

jest.mock('../utils', () => ({
  getBulkOperationError: jest.fn(),
  getExpectedVersionProperties: jest.fn(),
  rawDocExistsInNamespace: jest.fn(),
  isLeft: jest.requireActual('../utils').isLeft,
  isRight: jest.requireActual('../utils').isRight,
  left: jest.requireActual('../utils').left,
  right: jest.requireActual('../utils').right,
}));

type SetupParams = Partial<Pick<ChangeAccessControlParams, 'objects'>>;

const READ_ONLY_TYPE = 'read-only-type';
const NON_READ_ONLY_TYPE = 'non-read-only-type';

const BULK_ERROR = {
  error: 'Oh no, a bulk error!',
  type: 'error_type',
  message: 'error_message',
  statusCode: 400,
};

describe('changeObjectAccessControl', () => {
  function setup(
    { objects = [] }: SetupParams,
    securityExtension?: ISavedObjectsSecurityExtension
  ) {
    const registry = typeRegistryMock.create();
    registry.supportsAccessControl.mockImplementation((type) => type === READ_ONLY_TYPE);
    const client = elasticsearchClientMock.createElasticsearchClient();
    const serializer = new SavedObjectsSerializer(registry);
    return {
      mappings: { properties: {} }, // doesn't matter, only used as an argument to deleteLegacyUrlAliases which is mocked
      registry,
      allowedTypes: [READ_ONLY_TYPE, NON_READ_ONLY_TYPE],
      client,
      serializer,
      logger: loggerMock.create(),
      getIndexForType: (type: string) => `index-for-${type}`,
      securityExtension,
      objects,
    };
  }

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
    expect(client.mget).toHaveBeenCalledWith({ docs }, expect.anything());
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

  /** Asserts that bulk is called for the given objects */
  function expectBulkArgs(
    ...objectActions: Array<{
      object: { type: string; id: string; namespaces?: string[] };
      action: 'update' | 'delete';
    }>
  ) {
    const operations = objectActions.flatMap(
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
    expect(client.bulk).toHaveBeenCalledWith(expect.objectContaining({ operations }));
  }

  beforeEach(() => {
    mockGetBulkOperationError.mockReset(); // reset calls and return undefined by default
  });
  describe('changeOwnership', () => {
    it('should throw an error if owner is not specified', async () => {
      const params = setup({
        objects: [{ type: READ_ONLY_TYPE, id: 'id-1' }],
      });

      await expect(() =>
        changeObjectAccessControl({
          ...params,
          options: {
            owner: undefined,
          },
          actionType: 'changeOwnership',
        })
      ).rejects.toThrow(
        'The "owner" field is required to change ownership of a saved object.: Bad Request'
      );
    });
    it('should throw an error if no read only objects are specified', async () => {
      const params = setup({
        objects: [{ type: NON_READ_ONLY_TYPE, id: 'id-1' }],
      });

      const result = await changeObjectAccessControl({
        ...params,
        options: {
          owner: 'owner-1',
        },
        actionType: 'changeOwnership',
      });
      expect(result.objects[0]).toHaveProperty('error');
      expect(result.objects[0].error).toBe(
        `[Error: The type "${NON_READ_ONLY_TYPE}" does not support access control.: Bad Request]`
      );
    });

    it('should allow partial ownership change', async () => {
      const params = setup({
        objects: [
          { type: READ_ONLY_TYPE, id: 'id-1' },
          { type: NON_READ_ONLY_TYPE, id: 'id-2' },
        ],
      });

      const result = await changeObjectAccessControl({
        ...params,
        options: {
          owner: 'new-owner',
        },
        actionType: 'changeOwnership',
      });
      expect(result).toHaveProperty('error');
    });
  });
});
