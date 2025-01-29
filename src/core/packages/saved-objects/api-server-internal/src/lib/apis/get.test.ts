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
  mockGetSearchDsl,
} from '../repository.test.mock';

import * as estypes from '@elastic/elasticsearch/lib/api/types';

import type { SavedObjectsBaseOptions } from '@kbn/core-saved-objects-api-server';
import { ALL_NAMESPACES_STRING } from '@kbn/core-saved-objects-utils-server';
import { SavedObjectsRepository } from '../repository';
import { loggerMock } from '@kbn/logging-mocks';
import { SavedObjectsSerializer } from '@kbn/core-saved-objects-base-server-internal';
import { kibanaMigratorMock } from '../../mocks';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import type { ISavedObjectsSecurityExtension } from '@kbn/core-saved-objects-server';
import { savedObjectsExtensionsMock } from '../../mocks/saved_objects_extensions.mock';

import {
  NAMESPACE_AGNOSTIC_TYPE,
  MULTI_NAMESPACE_ISOLATED_TYPE,
  HIDDEN_TYPE,
  mockTimestamp,
  mappings,
  mockVersion,
  createRegistry,
  createDocumentMigrator,
  getMockGetResponse,
  createSpySerializer,
  getSuccess,
  createBadRequestErrorPayload,
  createGenericNotFoundErrorPayload,
} from '../../test_helpers/repository.test.common';

describe('#get', () => {
  let client: ReturnType<typeof elasticsearchClientMock.createElasticsearchClient>;
  let repository: SavedObjectsRepository;
  let migrator: ReturnType<typeof kibanaMigratorMock.create>;
  let logger: ReturnType<typeof loggerMock.create>;
  let serializer: jest.Mocked<SavedObjectsSerializer>;
  let securityExtension: jest.Mocked<ISavedObjectsSecurityExtension>;

  const registry = createRegistry();
  const documentMigrator = createDocumentMigrator(registry);

  const expectMigrationArgs = (args: unknown, contains = true, n = 1) => {
    const obj = contains ? expect.objectContaining(args) : expect.not.objectContaining(args);
    expect(migrator.migrateDocument).toHaveBeenNthCalledWith(
      n,
      obj,
      expect.objectContaining({
        allowDowngrade: expect.any(Boolean),
      })
    );
  };

  beforeEach(() => {
    pointInTimeFinderMock.mockClear();
    client = elasticsearchClientMock.createElasticsearchClient();
    migrator = kibanaMigratorMock.create();
    documentMigrator.prepareMigrations();
    migrator.migrateDocument = jest.fn().mockImplementation(documentMigrator.migrate);
    migrator.runMigrations = jest.fn().mockResolvedValue([{ status: 'skipped' }]);
    logger = loggerMock.create();
    securityExtension = savedObjectsExtensionsMock.createSecurityExtension();

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

  describe('performGet', () => {
    const type = 'index-pattern';
    const id = 'logstash-*';
    const namespace = 'foo-namespace';
    const originId = 'some-origin-id';

    describe('client calls', () => {
      it(`should use the ES get action`, async () => {
        await getSuccess(client, repository, registry, type, id);
        expect(client.get).toHaveBeenCalledTimes(1);
      });

      it(`prepends namespace to the id when providing namespace for single-namespace type`, async () => {
        await getSuccess(client, repository, registry, type, id, { namespace });
        expect(client.get).toHaveBeenCalledWith(
          expect.objectContaining({
            id: `${namespace}:${type}:${id}`,
          }),
          expect.anything()
        );
      });

      it(`doesn't prepend namespace to the id when providing no namespace for single-namespace type`, async () => {
        await getSuccess(client, repository, registry, type, id);
        expect(client.get).toHaveBeenCalledWith(
          expect.objectContaining({
            id: `${type}:${id}`,
          }),
          expect.anything()
        );
      });

      it(`normalizes options.namespace from 'default' to undefined`, async () => {
        await getSuccess(client, repository, registry, type, id, { namespace: 'default' });
        expect(client.get).toHaveBeenCalledWith(
          expect.objectContaining({
            id: `${type}:${id}`,
          }),
          expect.anything()
        );
      });

      it(`doesn't prepend namespace to the id when not using single-namespace type`, async () => {
        await getSuccess(client, repository, registry, NAMESPACE_AGNOSTIC_TYPE, id, { namespace });
        expect(client.get).toHaveBeenCalledWith(
          expect.objectContaining({
            id: `${NAMESPACE_AGNOSTIC_TYPE}:${id}`,
          }),
          expect.anything()
        );

        client.get.mockClear();
        await getSuccess(client, repository, registry, MULTI_NAMESPACE_ISOLATED_TYPE, id, {
          namespace,
        });
        expect(client.get).toHaveBeenCalledWith(
          expect.objectContaining({
            id: `${MULTI_NAMESPACE_ISOLATED_TYPE}:${id}`,
          }),
          expect.anything()
        );
      });
    });

    describe('errors', () => {
      const expectNotFoundError = async (
        type: string,
        id: string,
        options?: SavedObjectsBaseOptions
      ) => {
        await expect(repository.get(type, id, options)).rejects.toThrowError(
          createGenericNotFoundErrorPayload(type, id)
        );
      };

      it(`throws when options.namespace is '*'`, async () => {
        await expect(
          repository.get(type, id, { namespace: ALL_NAMESPACES_STRING })
        ).rejects.toThrowError(createBadRequestErrorPayload('"options.namespace" cannot be "*"'));
      });

      it(`throws when type is invalid`, async () => {
        await expectNotFoundError('unknownType', id);
        expect(client.get).not.toHaveBeenCalled();
      });

      it(`throws when type is hidden`, async () => {
        await expectNotFoundError(HIDDEN_TYPE, id);
        expect(client.get).not.toHaveBeenCalled();
      });

      it(`throws when ES is unable to find the document during get`, async () => {
        client.get.mockResolvedValueOnce(
          elasticsearchClientMock.createSuccessTransportRequestPromise({
            found: false,
          } as estypes.GetResponse)
        );
        await expectNotFoundError(type, id);
        expect(client.get).toHaveBeenCalledTimes(1);
      });

      it(`throws when ES is unable to find the index during get`, async () => {
        client.get.mockResolvedValueOnce(
          elasticsearchClientMock.createSuccessTransportRequestPromise({} as estypes.GetResponse, {
            statusCode: 404,
          })
        );
        await expectNotFoundError(type, id);
        expect(client.get).toHaveBeenCalledTimes(1);
      });

      it(`throws when type is multi-namespace and the document exists, but not in this namespace`, async () => {
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
        expect(client.get).toHaveBeenCalledTimes(1);
      });
    });

    describe('returns', () => {
      it(`formats the ES response`, async () => {
        const result = await getSuccess(client, repository, registry, type, id);
        expect(result).toEqual({
          id,
          type,
          updated_at: mockTimestamp,
          version: mockVersion,
          attributes: {
            title: 'Testing',
          },
          references: [],
          namespaces: ['default'],
          coreMigrationVersion: expect.any(String),
          typeMigrationVersion: expect.any(String),
          managed: expect.any(Boolean),
        });
      });

      it(`includes namespaces if type is multi-namespace`, async () => {
        const result = await getSuccess(
          client,
          repository,
          registry,
          MULTI_NAMESPACE_ISOLATED_TYPE,
          id
        );
        expect(result).toMatchObject({
          namespaces: expect.any(Array),
        });
      });

      it(`include namespaces if type is not multi-namespace`, async () => {
        const result = await getSuccess(client, repository, registry, type, id);
        expect(result).toMatchObject({
          namespaces: ['default'],
        });
      });

      it(`includes originId property if present in cluster call response`, async () => {
        const result = await getSuccess(client, repository, registry, type, id, {}, originId);
        expect(result).toMatchObject({ originId });
      });
    });

    it('migrates the fetched document', async () => {
      migrator.migrateDocument.mockReturnValueOnce(
        'migrated' as unknown as ReturnType<typeof migrator.migrateDocument>
      );
      await expect(getSuccess(client, repository, registry, type, id)).resolves.toBe('migrated');
      expect(migrator.migrateDocument).toHaveBeenCalledTimes(1);
      expectMigrationArgs({
        id,
        type,
      });
    });

    describe('security', () => {
      it('correctly passes params to securityExtension.authorizeGet', async () => {
        await getSuccess(client, repository, registry, type, id);

        expect(securityExtension.authorizeGet).toHaveBeenCalledWith(
          expect.objectContaining({
            object: {
              existingNamespaces: [],
              id: 'logstash-*',
              name: 'Testing',
              type: 'index-pattern',
            },
          })
        );
      });
    });
  });
});
