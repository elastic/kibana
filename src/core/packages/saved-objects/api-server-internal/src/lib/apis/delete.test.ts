/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable @typescript-eslint/no-shadow */

import {
  pointInTimeFinderMock,
  mockGetCurrentTime,
  mockDeleteLegacyUrlAliases,
  mockGetSearchDsl,
} from '../repository.test.mock';

import type { estypes } from '@elastic/elasticsearch';

import type { SavedObjectsDeleteOptions } from '@kbn/core-saved-objects-api-server';
import { ALL_NAMESPACES_STRING } from '@kbn/core-saved-objects-utils-server';

import { SavedObjectsRepository } from '../repository';
import { loggerMock } from '@kbn/logging-mocks';
import type { SavedObjectsSerializer } from '@kbn/core-saved-objects-base-server-internal';
import { kibanaMigratorMock } from '../../mocks';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { savedObjectsExtensionsMock } from '../../mocks/saved_objects_extensions.mock';
import type { ISavedObjectsSecurityExtension } from '@kbn/core-saved-objects-server';

import {
  NAMESPACE_AGNOSTIC_TYPE,
  MULTI_NAMESPACE_TYPE,
  MULTI_NAMESPACE_ISOLATED_TYPE,
  HIDDEN_TYPE,
  mockVersionProps,
  mockTimestamp,
  mappings,
  createRegistry,
  createDocumentMigrator,
  getMockGetResponse,
  createSpySerializer,
  deleteSuccess,
  createBadRequestErrorPayload,
  createGenericNotFoundErrorPayload,
} from '../../test_helpers/repository.test.common';

describe('#delete', () => {
  let client: ReturnType<typeof elasticsearchClientMock.createElasticsearchClient>;
  let repository: SavedObjectsRepository;
  let migrator: ReturnType<typeof kibanaMigratorMock.create>;
  let logger: ReturnType<typeof loggerMock.create>;
  let serializer: jest.Mocked<SavedObjectsSerializer>;
  let securityExtension: jest.Mocked<ISavedObjectsSecurityExtension>;

  const registry = createRegistry();
  const documentMigrator = createDocumentMigrator(registry);

  beforeEach(() => {
    pointInTimeFinderMock.mockClear();
    client = elasticsearchClientMock.createElasticsearchClient();
    migrator = kibanaMigratorMock.create();
    documentMigrator.prepareMigrations();
    migrator.migrateDocument = jest.fn().mockImplementation(documentMigrator.migrate);
    migrator.runMigrations = jest.fn().mockResolvedValue([{ status: 'skipped' }]);
    securityExtension = savedObjectsExtensionsMock.createSecurityExtension();
    logger = loggerMock.create();

    // create a mock serializer "shim" so we can track function calls, but use the real serializer's implementation
    serializer = createSpySerializer(registry);

    const allTypes = registry.getAllTypes().map((type) => type.name);
    const allowedTypes = [...new Set(allTypes.filter((type) => !registry.isHidden(type)))];

    // @ts-expect-error must use the private constructor to use the mocked serializer
    repository = new SavedObjectsRepository({
      index: '.kibana-test',
      mappings,
      client,
      migrator,
      typeRegistry: registry,
      serializer,
      allowedTypes,
      logger,
      extensions: {
        securityExtension,
      },
    });

    mockGetCurrentTime.mockReturnValue(mockTimestamp);
    mockGetSearchDsl.mockClear();
  });

  describe('performDelete', () => {
    const type = 'index-pattern';
    const id = 'logstash-*';
    const namespace = 'foo-namespace';

    beforeEach(() => {
      mockDeleteLegacyUrlAliases.mockClear();
      mockDeleteLegacyUrlAliases.mockResolvedValue();
    });

    describe('client calls', () => {
      it(`should use the ES delete action when not using a multi-namespace type`, async () => {
        client.get.mockResolvedValue(
          elasticsearchClientMock.createSuccessTransportRequestPromise(
            getMockGetResponse(registry, { type, id })
          )
        );
        client.delete.mockResolvedValueOnce(
          elasticsearchClientMock.createSuccessTransportRequestPromise({
            result: 'deleted',
          } as estypes.DeleteResponse)
        );
        await repository.delete(type, id);
        expect(client.get).toHaveBeenCalledTimes(1);
        expect(client.delete).toHaveBeenCalledTimes(1);
        client.get.mockClear();
      });

      it(`should use ES get action then delete action when using a multi-namespace type`, async () => {
        client.get.mockResolvedValue(
          elasticsearchClientMock.createSuccessTransportRequestPromise(
            getMockGetResponse(registry, { type: MULTI_NAMESPACE_ISOLATED_TYPE, id })
          )
        );
        client.delete.mockResolvedValueOnce(
          elasticsearchClientMock.createSuccessTransportRequestPromise({
            result: 'deleted',
          } as estypes.DeleteResponse)
        );
        await repository.delete(MULTI_NAMESPACE_ISOLATED_TYPE, id);
        expect(client.get).toHaveBeenCalledTimes(2);
        expect(client.delete).toHaveBeenCalledTimes(1);
        client.get.mockClear();
      });

      it(`does not includes the version of the existing document when using a multi-namespace type`, async () => {
        await deleteSuccess(client, repository, registry, MULTI_NAMESPACE_ISOLATED_TYPE, id);
        const versionProperties = {
          if_seq_no: mockVersionProps._seq_no,
          if_primary_term: mockVersionProps._primary_term,
        };
        expect(client.delete).toHaveBeenCalledWith(
          expect.not.objectContaining(versionProperties),
          expect.anything()
        );
      });

      it(`defaults to a refresh setting of wait_for`, async () => {
        await deleteSuccess(client, repository, registry, type, id);
        expect(client.delete).toHaveBeenCalledWith(
          expect.objectContaining({ refresh: 'wait_for' }),
          expect.anything()
        );
      });

      it(`prepends namespace to the id when providing namespace for single-namespace type`, async () => {
        await deleteSuccess(client, repository, registry, type, id, { namespace });
        expect(client.delete).toHaveBeenCalledWith(
          expect.objectContaining({ id: `${namespace}:${type}:${id}` }),
          expect.anything()
        );
      });

      it(`doesn't prepend namespace to the id when providing no namespace for single-namespace type`, async () => {
        await deleteSuccess(client, repository, registry, type, id);
        expect(client.delete).toHaveBeenCalledWith(
          expect.objectContaining({ id: `${type}:${id}` }),
          expect.anything()
        );
      });

      it(`normalizes options.namespace from 'default' to undefined`, async () => {
        await deleteSuccess(client, repository, registry, type, id, { namespace: 'default' });
        expect(client.delete).toHaveBeenCalledWith(
          expect.objectContaining({ id: `${type}:${id}` }),
          expect.anything()
        );
      });

      it(`doesn't prepend namespace to the id when not using single-namespace type`, async () => {
        await deleteSuccess(client, repository, registry, NAMESPACE_AGNOSTIC_TYPE, id, {
          namespace,
        });
        expect(client.delete).toHaveBeenCalledWith(
          expect.objectContaining({ id: `${NAMESPACE_AGNOSTIC_TYPE}:${id}` }),
          expect.anything()
        );

        client.delete.mockClear();
        await deleteSuccess(client, repository, registry, MULTI_NAMESPACE_ISOLATED_TYPE, id, {
          namespace,
        });
        expect(client.delete).toHaveBeenCalledWith(
          expect.objectContaining({ id: `${MULTI_NAMESPACE_ISOLATED_TYPE}:${id}` }),
          expect.anything()
        );
      });
    });

    describe('legacy URL aliases', () => {
      it(`doesn't delete legacy URL aliases for single-namespace object types`, async () => {
        await deleteSuccess(client, repository, registry, type, id, { namespace });
        expect(mockDeleteLegacyUrlAliases).not.toHaveBeenCalled();
      });

      // We intentionally do not include a test case for a multi-namespace object with a "not found" preflight result, because that throws
      // an error (without deleting aliases) and we already have a test case for that

      it(`deletes legacy URL aliases for multi-namespace object types (all spaces)`, async () => {
        const internalOptions = {
          mockGetResponseValue: getMockGetResponse(
            registry,
            { type: MULTI_NAMESPACE_TYPE, id },
            ALL_NAMESPACES_STRING
          ),
        };
        await deleteSuccess(
          client,
          repository,
          registry,
          MULTI_NAMESPACE_TYPE,
          id,
          { namespace, force: true },
          internalOptions
        );
        expect(mockDeleteLegacyUrlAliases).toHaveBeenCalledWith(
          expect.objectContaining({
            type: MULTI_NAMESPACE_TYPE,
            id,
            namespaces: [],
            deleteBehavior: 'exclusive',
          })
        );
      });

      it(`deletes legacy URL aliases for multi-namespace object types (specific spaces)`, async () => {
        await deleteSuccess(client, repository, registry, MULTI_NAMESPACE_TYPE, id, { namespace }); // this function mocks a preflight response with the given namespace by default
        expect(mockDeleteLegacyUrlAliases).toHaveBeenCalledWith(
          expect.objectContaining({
            type: MULTI_NAMESPACE_TYPE,
            id,
            namespaces: [namespace],
            deleteBehavior: 'inclusive',
          })
        );
      });

      it(`logs a message when deleteLegacyUrlAliases returns an error`, async () => {
        client.get.mockResolvedValue(
          elasticsearchClientMock.createSuccessTransportRequestPromise(
            getMockGetResponse(registry, { type: MULTI_NAMESPACE_ISOLATED_TYPE, id, namespace })
          )
        );
        client.delete.mockResolvedValueOnce(
          elasticsearchClientMock.createSuccessTransportRequestPromise({
            result: 'deleted',
          } as estypes.DeleteResponse)
        );
        mockDeleteLegacyUrlAliases.mockRejectedValueOnce(new Error('Oh no!'));
        await repository.delete(MULTI_NAMESPACE_ISOLATED_TYPE, id, { namespace });
        expect(client.get).toHaveBeenCalledTimes(2);
        expect(logger.error).toHaveBeenCalledTimes(1);
        expect(logger.error).toHaveBeenCalledWith(
          'Unable to delete aliases when deleting an object: Oh no!'
        );
        client.get.mockClear();
      });
    });

    describe('errors', () => {
      const expectNotFoundError = async (
        type: string,
        id: string,
        options?: SavedObjectsDeleteOptions
      ) => {
        await expect(repository.delete(type, id, options)).rejects.toThrowError(
          createGenericNotFoundErrorPayload(type, id)
        );
      };

      it(`throws when options.namespace is '*'`, async () => {
        await expect(
          repository.delete(type, id, { namespace: ALL_NAMESPACES_STRING })
        ).rejects.toThrowError(createBadRequestErrorPayload('"options.namespace" cannot be "*"'));
      });

      it(`throws when type is invalid`, async () => {
        await expectNotFoundError('unknownType', id);
        expect(client.delete).not.toHaveBeenCalled();
      });

      it(`throws when type is hidden`, async () => {
        await expectNotFoundError(HIDDEN_TYPE, id);
        expect(client.delete).not.toHaveBeenCalled();
      });

      it(`throws when ES is unable to find the document during get`, async () => {
        client.get.mockResolvedValueOnce(
          elasticsearchClientMock.createSuccessTransportRequestPromise({
            found: false,
          } as estypes.GetResponse)
        );
        await expectNotFoundError(MULTI_NAMESPACE_ISOLATED_TYPE, id);
        expect(client.get).toHaveBeenCalledTimes(2);
      });

      it(`throws when ES is unable to find the index during get`, async () => {
        client.get.mockResolvedValueOnce(
          elasticsearchClientMock.createSuccessTransportRequestPromise({} as estypes.GetResponse, {
            statusCode: 404,
          })
        );
        await expectNotFoundError(MULTI_NAMESPACE_ISOLATED_TYPE, id);
        expect(client.get).toHaveBeenCalledTimes(2);
      });

      it(`throws when the type is multi-namespace and the document exists, but not in this namespace`, async () => {
        const response = getMockGetResponse(
          registry,
          { type: MULTI_NAMESPACE_ISOLATED_TYPE, id },
          namespace
        );
        client.get.mockResolvedValueOnce(
          elasticsearchClientMock.createSuccessTransportRequestPromise(response)
        );
        await expectNotFoundError(MULTI_NAMESPACE_ISOLATED_TYPE, id, {
          namespace: 'bar-namespace',
        });
        expect(client.get).toHaveBeenCalledTimes(2);
      });

      it(`throws when the type is multi-namespace and the document has multiple namespaces and the force option is not enabled`, async () => {
        const response = getMockGetResponse(registry, {
          type: MULTI_NAMESPACE_ISOLATED_TYPE,
          id,
          namespace,
        });
        response._source!.namespaces = [namespace, 'bar-namespace'];
        client.get.mockResponse(response);

        await expect(
          repository.delete(MULTI_NAMESPACE_ISOLATED_TYPE, id, { namespace })
        ).rejects.toThrowError(
          'Unable to delete saved object that exists in multiple namespaces, use the `force` option to delete it anyway'
        );
        expect(client.get).toHaveBeenCalledTimes(2);
        client.get.mockClear();
      });

      it(`throws when the type is multi-namespace and the document has all namespaces and the force option is not enabled`, async () => {
        const response = getMockGetResponse(registry, {
          type: MULTI_NAMESPACE_ISOLATED_TYPE,
          id,
          namespace,
        });

        response._source!.namespaces = ['*'];
        client.get.mockResponse(response);

        await expect(
          repository.delete(MULTI_NAMESPACE_ISOLATED_TYPE, id, { namespace })
        ).rejects.toThrowError(
          'Unable to delete saved object that exists in multiple namespaces, use the `force` option to delete it anyway'
        );
        expect(client.get).toHaveBeenCalledTimes(2);
        client.get.mockClear();
      });

      it(`throws when ES is unable to find the document during delete`, async () => {
        client.delete.mockResolvedValueOnce(
          elasticsearchClientMock.createSuccessTransportRequestPromise({
            result: 'not_found',
          } as estypes.DeleteResponse)
        );
        await expectNotFoundError(type, id);
        expect(client.delete).toHaveBeenCalledTimes(1);
      });

      it(`throws when ES is unable to find the index during delete`, async () => {
        client.delete.mockResolvedValueOnce(
          elasticsearchClientMock.createSuccessTransportRequestPromise({
            // @elastic/elasticsearch doesn't declare error on DeleteResponse
            error: { type: 'index_not_found_exception' },
          } as unknown as estypes.DeleteResponse)
        );
        await expectNotFoundError(type, id);
        expect(client.delete).toHaveBeenCalledTimes(1);
      });

      it(`throws when ES returns an unexpected response`, async () => {
        client.delete.mockResolvedValueOnce(
          elasticsearchClientMock.createSuccessTransportRequestPromise({
            result: 'something unexpected' as estypes.Result,
          } as estypes.DeleteResponse)
        );
        await expect(repository.delete(type, id)).rejects.toThrowError(
          'Unexpected Elasticsearch DELETE response'
        );
        expect(client.delete).toHaveBeenCalledTimes(1);
      });
    });

    describe('returns', () => {
      it(`returns an empty object on success`, async () => {
        const result = await deleteSuccess(client, repository, registry, type, id);
        expect(result).toEqual({});
      });
    });

    describe('security', () => {
      it('calls securityExtension.authorizeDelete with the correct parameters', async () => {
        client.get.mockResponse({
          _source: {
            'index-pattern': {
              name: 'foo_name',
            },
          },
          found: true,
          _index: '.kibana',
          _id: id,
        });

        securityExtension.includeSavedObjectNames.mockReturnValue(true);

        client.delete.mockResponseOnce({
          result: 'deleted',
        } as estypes.DeleteResponse);
        await repository.delete(type, id, { namespace });

        expect(securityExtension.authorizeDelete).toHaveBeenLastCalledWith({
          namespace,
          object: { type: 'index-pattern', id, name: 'foo_name' },
        });
      });

      it('calls securityExtension.authorizeDelete with the correct parameters when includeSavedObjectNames is false', async () => {
        securityExtension.includeSavedObjectNames.mockReturnValue(false);

        client.delete.mockResponseOnce({
          result: 'deleted',
        } as estypes.DeleteResponse);

        await repository.delete(type, id, { namespace });

        expect(client.get).toHaveBeenCalledTimes(1);

        expect(securityExtension.authorizeDelete).toHaveBeenLastCalledWith({
          namespace,
          object: { type: 'index-pattern', id, name: undefined },
        });
      });
    });
  });
});
