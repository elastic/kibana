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

import { SavedObjectsRepository } from '../repository';
import { loggerMock } from '@kbn/logging-mocks';
import { SavedObjectsSerializer } from '@kbn/core-saved-objects-base-server-internal';
import { apiContextMock, ApiExecutionContextMock, kibanaMigratorMock } from '../../mocks';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';

import {
  mockTimestamp,
  mappings,
  createRegistry,
  createDocumentMigrator,
  removeReferencesToSuccess,
  createSpySerializer,
  createConflictErrorPayload,
  createType,
} from '../../test_helpers/repository.test.common';
import { performRemoveReferencesTo } from './remove_references_to';

describe('SavedObjectsRepository', () => {
  let client: ReturnType<typeof elasticsearchClientMock.createElasticsearchClient>;
  let repository: SavedObjectsRepository;
  let migrator: ReturnType<typeof kibanaMigratorMock.create>;
  let logger: ReturnType<typeof loggerMock.create>;
  let serializer: jest.Mocked<SavedObjectsSerializer>;

  const registry = createRegistry();
  const documentMigrator = createDocumentMigrator(registry);
  const fooType = createType('foo', {});
  const barType = createType('bar', {});

  beforeEach(() => {
    pointInTimeFinderMock.mockClear();
    client = elasticsearchClientMock.createElasticsearchClient();
    migrator = kibanaMigratorMock.create();
    documentMigrator.prepareMigrations();
    migrator.migrateDocument = jest.fn().mockImplementation(documentMigrator.migrate);
    migrator.runMigrations = jest.fn().mockResolvedValue([{ status: 'skipped' }]);
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
    });

    mockGetCurrentTime.mockReturnValue(mockTimestamp);
    mockGetSearchDsl.mockClear();
  });

  describe('#removeReferencesTo', () => {
    const type = 'type';
    const id = 'id';
    const defaultOptions = {};
    const updatedCount = 42;

    describe('client calls', () => {
      it('should use the ES updateByQuery action', async () => {
        await removeReferencesToSuccess(client, repository, type, id);
        expect(client.updateByQuery).toHaveBeenCalledTimes(1);
      });

      it('uses the correct default `refresh` value', async () => {
        await removeReferencesToSuccess(client, repository, type, id);
        expect(client.updateByQuery).toHaveBeenCalledWith(
          expect.objectContaining({
            refresh: true,
          }),
          expect.any(Object)
        );
      });

      it('merges output of getSearchDsl into es request body', async () => {
        const query = { query: 1, aggregations: 2 };
        mockGetSearchDsl.mockReturnValue(query);
        await removeReferencesToSuccess(client, repository, type, id, { type });

        expect(client.updateByQuery).toHaveBeenCalledWith(
          expect.objectContaining({ ...query }),
          expect.anything()
        );
      });

      it('should set index to all known SO indices on the request', async () => {
        await removeReferencesToSuccess(client, repository, type, id);
        expect(client.updateByQuery).toHaveBeenCalledWith(
          expect.objectContaining({
            index: ['.kibana-test_8.0.0-testing', 'custom_8.0.0-testing'],
          }),
          expect.anything()
        );
      });

      it('should use the `refresh` option in the request', async () => {
        const refresh = Symbol();

        await removeReferencesToSuccess(client, repository, type, id, { refresh });
        expect(client.updateByQuery).toHaveBeenCalledWith(
          expect.objectContaining({
            refresh,
          }),
          expect.anything()
        );
      });

      it('should pass the correct parameters to the update script', async () => {
        await removeReferencesToSuccess(client, repository, type, id);
        expect(client.updateByQuery).toHaveBeenCalledWith(
          expect.objectContaining({
            script: expect.objectContaining({
              params: {
                type,
                id,
              },
            }),
          }),
          expect.anything()
        );
      });
    });

    describe('search dsl', () => {
      it(`passes mappings and registry to getSearchDsl`, async () => {
        await removeReferencesToSuccess(client, repository, type, id);
        expect(mockGetSearchDsl).toHaveBeenCalledWith(mappings, registry, expect.anything());
      });

      it('passes namespace to getSearchDsl', async () => {
        await removeReferencesToSuccess(client, repository, type, id, { namespace: 'some-ns' });
        expect(mockGetSearchDsl).toHaveBeenCalledWith(
          mappings,
          registry,
          expect.objectContaining({
            namespaces: ['some-ns'],
          })
        );
      });

      it('passes hasReference to getSearchDsl', async () => {
        await removeReferencesToSuccess(client, repository, type, id);
        expect(mockGetSearchDsl).toHaveBeenCalledWith(
          mappings,
          registry,
          expect.objectContaining({
            hasReference: {
              type,
              id,
            },
          })
        );
      });

      it('passes all known types to getSearchDsl', async () => {
        await removeReferencesToSuccess(client, repository, type, id);
        expect(mockGetSearchDsl).toHaveBeenCalledWith(
          mappings,
          registry,
          expect.objectContaining({
            type: registry.getAllTypes().map((type) => type.name),
          })
        );
      });
    });

    describe('returns', () => {
      it('returns the updated count from the ES response', async () => {
        const response = await removeReferencesToSuccess(client, repository, type, id);
        expect(response.updated).toBe(updatedCount);
      });
    });

    describe('errors', () => {
      it(`throws when ES returns failures`, async () => {
        client.updateByQuery.mockResponseOnce({
          updated: 7,
          failures: [
            { id: 'failure' } as estypes.BulkIndexByScrollFailure,
            { id: 'another-failure' } as estypes.BulkIndexByScrollFailure,
          ],
        });

        await expect(repository.removeReferencesTo(type, id, defaultOptions)).rejects.toThrowError(
          createConflictErrorPayload(type, id)
        );
      });
    });
  });
  describe('performRemoveReferencesTo', () => {
    const namespace = 'some_ns';
    const indices = ['.kib_1', '.kib_2'];
    let apiExecutionContext: ApiExecutionContextMock;

    beforeEach(() => {
      apiExecutionContext = apiContextMock.create();
      apiExecutionContext.registry.registerType(fooType);
      apiExecutionContext.registry.registerType(barType);

      apiExecutionContext.helpers.common.getCurrentNamespace.mockImplementation(
        (space) => space ?? 'default'
      );
      apiExecutionContext.helpers.common.getIndicesForTypes.mockReturnValue(indices);
    });

    describe('with all extensions enabled', () => {
      it('calls getCurrentNamespace with the correct parameters', async () => {
        await performRemoveReferencesTo(
          { type: 'foo', id: 'id', options: { namespace } },
          apiExecutionContext
        );

        const commonHelper = apiExecutionContext.helpers.common;
        expect(commonHelper.getCurrentNamespace).toHaveBeenCalledTimes(1);
        expect(commonHelper.getCurrentNamespace).toHaveBeenLastCalledWith(namespace);
      });

      it('calls authorizeRemoveReferences with the correct parameters', async () => {
        apiExecutionContext.client.get.mockResponse({
          _source: {
            foo: {
              name: 'foo_name',
            },
          },
          found: true,
          _index: '.kibana',
          _id: 'id',
        });

        const securityExt = apiExecutionContext.extensions.securityExtension!;

        securityExt.includeSavedObjectNames.mockReturnValue(true);

        await performRemoveReferencesTo(
          { type: 'foo', id: 'id', options: { namespace } },
          apiExecutionContext
        );

        expect(securityExt.authorizeRemoveReferences).toHaveBeenLastCalledWith({
          namespace,
          object: { type: 'foo', id: 'id', name: 'foo_name' },
        });
      });

      it('calls authorizeRemoveReferences with the correct parameters when includeSavedObjectNames is disabled', async () => {
        apiExecutionContext.extensions.securityExtension.includeSavedObjectNames.mockReturnValue(
          false
        );

        expect(apiExecutionContext.client.get).not.toHaveBeenCalled();

        await performRemoveReferencesTo(
          { type: 'foo', id: 'id', options: { namespace } },
          apiExecutionContext
        );

        const securityExt = apiExecutionContext.extensions.securityExtension!;
        expect(securityExt.authorizeRemoveReferences).toHaveBeenCalledTimes(1);
        expect(securityExt.authorizeRemoveReferences).toHaveBeenLastCalledWith({
          namespace,
          object: { type: 'foo', id: 'id' },
        });
      });

      it('calls client.updateByQuery with the correct parameters', async () => {
        await performRemoveReferencesTo(
          { type: 'foo', id: 'id', options: { namespace, refresh: false } },
          apiExecutionContext
        );

        const client = apiExecutionContext.client;
        expect(client.updateByQuery).toHaveBeenCalledTimes(1);
        expect(client.updateByQuery).toHaveBeenLastCalledWith(
          expect.objectContaining({
            refresh: false,
            index: indices,
          }),
          { ignore: [404], meta: true }
        );
      });
    });
  });
});
