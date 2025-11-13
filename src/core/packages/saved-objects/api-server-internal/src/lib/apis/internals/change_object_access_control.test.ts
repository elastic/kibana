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
import type {
  ISavedObjectsSecurityExtension,
  SavedObjectAccessControl,
} from '@kbn/core-saved-objects-server';
import { SavedObjectsSerializer } from '@kbn/core-saved-objects-base-server-internal';
import {
  type ChangeAccessControlParams,
  changeObjectAccessControl,
} from './change_object_access_control';
import { mockGetBulkOperationError } from './update_objects_spaces.test.mock';
import { savedObjectsExtensionsMock } from '../../../mocks/saved_objects_extensions.mock';

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

const ACCESS_CONTROL_TYPE = 'access-control-type';
const NON_ACCESS_CONTROL_TYPE = 'non-access-control-type';

const BULK_ERROR = {
  error: 'Oh no, a bulk error!',
  type: 'error_type',
  message: 'error_message',
  statusCode: 400,
};

const VERSION_PROPS = { _seq_no: 1, _primary_term: 1 };
const mockSecurityExt = savedObjectsExtensionsMock.createSecurityExtension();
const mockUserProfileId = 'u_mock_id';

describe('changeObjectAccessControl', () => {
  let client: ReturnType<typeof elasticsearchClientMock.createElasticsearchClient>;

  function setup(
    { objects = [] }: SetupParams,
    securityExtension?: ISavedObjectsSecurityExtension
  ) {
    const registry = typeRegistryMock.create();
    registry.supportsAccessControl.mockImplementation((type) => type === ACCESS_CONTROL_TYPE);
    client = elasticsearchClientMock.createElasticsearchClient();
    const serializer = new SavedObjectsSerializer(registry);

    return {
      mappings: { properties: {} }, // doesn't matter, only used as an argument to deleteLegacyUrlAliases which is mocked
      registry,
      allowedTypes: [ACCESS_CONTROL_TYPE, NON_ACCESS_CONTROL_TYPE],
      client,
      serializer,
      logger: loggerMock.create(),
      getIndexForType: (type: string) => `index-for-${type}`,
      securityExtension: mockSecurityExt,
      objects,
    };
  }

  function mockMgetResults(
    results: Array<
      | { found: false }
      | {
          found: true;
          namespaces: string[];
          type?: string;
          id?: string;
          accessControl?: SavedObjectAccessControl;
        }
    >
  ) {
    const result = results.map((x) =>
      x.found
        ? {
            _id: `${x.type ?? ACCESS_CONTROL_TYPE}:${x.id ?? 'id-unknown'}`,
            _index: `index-for-${x.type ?? ACCESS_CONTROL_TYPE}`,
            _source: { namespaces: x.namespaces, accessControl: x.accessControl },
            _seq_no: VERSION_PROPS._seq_no,
            _primary_term: VERSION_PROPS._primary_term,

            found: true,
          }
        : {
            _id: `unknown-type:${'id-unknown'}`,
            _index: `index-for-unknown-type`,
            found: false,
          }
    );

    client.mget.mockResponseOnce({ docs: result });
  }

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

  beforeEach(() => {
    mockGetBulkOperationError.mockReset(); // reset calls and return undefined by default
  });
  describe('ownership changes', () => {
    describe('validation', () => {
      it('throws if owner is not specified', async () => {
        const params = setup({
          objects: [{ type: ACCESS_CONTROL_TYPE, id: 'id-1' }],
        });

        await expect(() =>
          changeObjectAccessControl({
            ...params,
            options: {
              newOwnerProfileUid: undefined,
            },
            actionType: 'changeOwnership',
            currentUserProfileUid: '',
          })
        ).rejects.toThrow(
          'The "newOwnerProfileUid" field is required to change ownership of a saved object.: Bad Request'
        );
      });

      it('throws if owner has invalid user profile id', async () => {
        const params = setup({
          objects: [{ type: ACCESS_CONTROL_TYPE, id: 'id-1' }],
        });

        await expect(() =>
          changeObjectAccessControl({
            ...params,
            options: {
              newOwnerProfileUid: 'invalid_user_profile_id',
            },
            actionType: 'changeOwnership',
            currentUserProfileUid: mockUserProfileId,
          })
        ).rejects.toThrow(
          'User profile ID is invalid: expected "u_<principal>_<version>": Bad Request'
        );
      });

      it('returns error if no access control objects are specified', async () => {
        const params = setup({
          objects: [
            { type: NON_ACCESS_CONTROL_TYPE, id: 'id-1' },
            { type: NON_ACCESS_CONTROL_TYPE, id: 'id-2' },
          ],
        });

        const result = await changeObjectAccessControl({
          ...params,
          options: {
            newOwnerProfileUid: 'u_unittestuser_version',
          },
          actionType: 'changeOwnership',
          currentUserProfileUid: mockUserProfileId,
        });
        expect(result.objects[0]).toHaveProperty('error');
        const error = result.objects[0].error;
        expect(error).toBeTruthy();
        expect(error!.message).toBe(
          `The type ${NON_ACCESS_CONTROL_TYPE} does not support access control: Bad Request`
        );
      });
    });

    describe('bulk and mget behavior', () => {
      it('does not call bulk if no objects need to be updated', async () => {
        const params = setup({
          objects: [{ type: NON_ACCESS_CONTROL_TYPE, id: 'id-1' }],
        });
        mockMgetResults([{ found: true, namespaces: ['default'] }]);
        const result = await changeObjectAccessControl({
          ...params,
          options: { newOwnerProfileUid: 'u_unittestuser_version' },
          actionType: 'changeOwnership',
          currentUserProfileUid: mockUserProfileId,
        });
        expect(client.mget).not.toHaveBeenCalled();
        expect(client.bulk).not.toHaveBeenCalled();
        expect(result.objects[0]).toHaveProperty('error');
      });
    });

    describe('authorization of operations', () => {
      it('successfully delegates to security extension for change ownership', async () => {
        const params = setup({
          objects: [{ type: ACCESS_CONTROL_TYPE, id: 'id-1' }],
        });
        mockMgetResults([
          {
            found: true,
            namespaces: ['default'],
            type: ACCESS_CONTROL_TYPE,
            id: 'id-1',
            accessControl: {
              owner: 'new-owner',
              accessMode: 'default',
            },
          },
        ]);
        mockBulkResults({ error: false });
        await changeObjectAccessControl({
          ...params,
          securityExtension: params.securityExtension,
          options: { newOwnerProfileUid: 'u_unittestuser_version', namespace: 'default' },
          actionType: 'changeOwnership',
          currentUserProfileUid: mockUserProfileId,
        });
        expect(mockSecurityExt.authorizeChangeAccessControl).toHaveBeenCalledWith(
          {
            namespace: 'default',
            objects: [
              {
                type: ACCESS_CONTROL_TYPE,
                id: 'id-1',
                accessControl: {
                  owner: 'new-owner',
                  accessMode: 'default',
                },
                existingNamespaces: ['default'],
              },
            ],
          },
          'changeOwnership'
        );
      });
    });
  });

  describe('change access mode', () => {
    describe('validation', () => {
      it('throws if access mode is not specified', async () => {
        const params = setup({
          objects: [{ type: ACCESS_CONTROL_TYPE, id: 'id-1' }],
        });

        await expect(() =>
          changeObjectAccessControl({
            ...params,
            options: {
              accessMode: undefined,
            },
            actionType: 'changeAccessMode',
            currentUserProfileUid: '',
          })
        ).rejects.toThrow(
          'The "accessMode" field is required to change access mode of a saved object.: Bad Request'
        );
      });

      it('returns error if no access control objects are specified', async () => {
        const params = setup({
          objects: [{ type: NON_ACCESS_CONTROL_TYPE, id: 'id-1' }],
        });

        const result = await changeObjectAccessControl({
          ...params,
          options: {
            accessMode: 'write_restricted',
          },
          actionType: 'changeAccessMode',
          currentUserProfileUid: mockUserProfileId,
        });
        expect(result.objects[0]).toHaveProperty('error');
        const error = result.objects[0].error;
        expect(error).toBeTruthy();
        expect(error!.message).toBe(
          `The type ${NON_ACCESS_CONTROL_TYPE} does not support access control: Bad Request`
        );
      });
    });
    describe('authorization of operations', () => {
      it('successfully delegates to security extension for change access mode', async () => {
        const params = setup({
          objects: [{ type: ACCESS_CONTROL_TYPE, id: 'id-1' }],
        });
        mockMgetResults([
          {
            found: true,
            namespaces: ['default'],
            type: ACCESS_CONTROL_TYPE,
            id: 'id-1',
            accessControl: {
              owner: 'new-owner',
              accessMode: 'default',
            },
          },
        ]);
        mockBulkResults({ error: false });
        await changeObjectAccessControl({
          ...params,
          securityExtension: params.securityExtension,
          options: { accessMode: 'write_restricted', namespace: 'default' },
          actionType: 'changeAccessMode',
          currentUserProfileUid: mockUserProfileId,
        });
        expect(mockSecurityExt.authorizeChangeAccessControl).toHaveBeenCalledWith(
          {
            namespace: 'default',
            objects: [
              {
                type: ACCESS_CONTROL_TYPE,
                id: 'id-1',
                accessControl: {
                  owner: 'new-owner',
                  accessMode: 'default',
                },
                existingNamespaces: ['default'],
              },
            ],
          },
          'changeAccessMode'
        );
      });
    });
  });
});
