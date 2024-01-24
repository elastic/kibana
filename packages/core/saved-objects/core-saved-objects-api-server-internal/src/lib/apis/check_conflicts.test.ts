/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  pointInTimeFinderMock,
  mockGetCurrentTime,
  mockGetSearchDsl,
} from '../repository.test.mock';

import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import { ALL_NAMESPACES_STRING } from '@kbn/core-saved-objects-utils-server';
import { SavedObjectsRepository } from '../repository';
import { loggerMock } from '@kbn/logging-mocks';
import { SavedObjectsSerializer } from '@kbn/core-saved-objects-base-server-internal';
import { kibanaMigratorMock } from '../../mocks';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';

import {
  NAMESPACE_AGNOSTIC_TYPE,
  MULTI_NAMESPACE_ISOLATED_TYPE,
  HIDDEN_TYPE,
  mockTimestamp,
  mappings,
  createRegistry,
  createDocumentMigrator,
  getMockGetResponse,
  type TypeIdTuple,
  createSpySerializer,
  checkConflicts,
  checkConflictsSuccess,
  createBadRequestErrorPayload,
  createUnsupportedTypeErrorPayload,
  createConflictErrorPayload,
} from '../../test_helpers/repository.test.common';

describe('#checkConflicts', () => {
  let client: ReturnType<typeof elasticsearchClientMock.createElasticsearchClient>;
  let repository: SavedObjectsRepository;
  let migrator: ReturnType<typeof kibanaMigratorMock.create>;
  let logger: ReturnType<typeof loggerMock.create>;
  let serializer: jest.Mocked<SavedObjectsSerializer>;

  const registry = createRegistry();
  const documentMigrator = createDocumentMigrator(registry);

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

  describe('performCheckConflicts', () => {
    const obj1 = { type: 'dashboard', id: 'one' };
    const obj2 = { type: 'dashboard', id: 'two' };
    const obj3 = { type: MULTI_NAMESPACE_ISOLATED_TYPE, id: 'three' };
    const obj4 = { type: MULTI_NAMESPACE_ISOLATED_TYPE, id: 'four' };
    const obj5 = { type: MULTI_NAMESPACE_ISOLATED_TYPE, id: 'five' };
    const obj6 = { type: NAMESPACE_AGNOSTIC_TYPE, id: 'six' };
    const obj7 = { type: NAMESPACE_AGNOSTIC_TYPE, id: 'seven' };
    const namespace = 'foo-namespace';

    const _expectClientCallArgs = (
      objects: TypeIdTuple[],
      {
        _index = expect.any(String),
        getId = () => expect.any(String),
      }: { _index?: string; getId?: (type: string, id: string) => string }
    ) => {
      expect(client.mget).toHaveBeenCalledWith(
        expect.objectContaining({
          body: {
            docs: objects.map(({ type, id }) =>
              expect.objectContaining({
                _index,
                _id: getId(type, id),
              })
            ),
          },
        }),
        expect.anything()
      );
    };

    describe('client calls', () => {
      it(`doesn't make a cluster call if the objects array is empty`, async () => {
        await checkConflicts(repository, []);
        expect(client.mget).not.toHaveBeenCalled();
      });

      it(`prepends namespace to the id when providing namespace for single-namespace type`, async () => {
        const getId = (type: string, id: string) => `${namespace}:${type}:${id}`; // test that the raw document ID equals this (e.g., has a namespace prefix)
        await checkConflictsSuccess(client, repository, registry, [obj1, obj2], { namespace });
        _expectClientCallArgs([obj1, obj2], { getId });
      });

      it(`doesn't prepend namespace to the id when providing no namespace for single-namespace type`, async () => {
        const getId = (type: string, id: string) => `${type}:${id}`; // test that the raw document ID equals this (e.g., does not have a namespace prefix)
        await checkConflictsSuccess(client, repository, registry, [obj1, obj2]);
        _expectClientCallArgs([obj1, obj2], { getId });
      });

      it(`normalizes options.namespace from 'default' to undefined`, async () => {
        const getId = (type: string, id: string) => `${type}:${id}`; // test that the raw document ID equals this (e.g., does not have a namespace prefix)
        await checkConflictsSuccess(client, repository, registry, [obj1, obj2], {
          namespace: 'default',
        });
        _expectClientCallArgs([obj1, obj2], { getId });
      });

      it(`doesn't prepend namespace to the id when not using single-namespace type`, async () => {
        const getId = (type: string, id: string) => `${type}:${id}`; // test that the raw document ID equals this (e.g., does not have a namespace prefix)
        // obj3 is multi-namespace, and obj6 is namespace-agnostic
        await checkConflictsSuccess(client, repository, registry, [obj3, obj6], { namespace });
        _expectClientCallArgs([obj3, obj6], { getId });
      });
    });

    describe('errors', () => {
      it(`throws when options.namespace is '*'`, async () => {
        await expect(
          repository.checkConflicts([obj1], { namespace: ALL_NAMESPACES_STRING })
        ).rejects.toThrowError(createBadRequestErrorPayload('"options.namespace" cannot be "*"'));
      });
    });

    describe('returns', () => {
      it(`expected results`, async () => {
        const unknownTypeObj = { type: 'unknownType', id: 'three' };
        const hiddenTypeObj = { type: HIDDEN_TYPE, id: 'three' };
        const objects = [unknownTypeObj, hiddenTypeObj, obj1, obj2, obj3, obj4, obj5, obj6, obj7];
        const response = {
          docs: [
            getMockGetResponse(registry, obj1),
            { found: false },
            getMockGetResponse(registry, obj3),
            getMockGetResponse(registry, { ...obj4, namespace: 'bar-namespace' }),
            { found: false },
            getMockGetResponse(registry, obj6),
            { found: false },
          ],
        } as estypes.MgetResponse;
        client.mget.mockResolvedValue(
          elasticsearchClientMock.createSuccessTransportRequestPromise(response)
        );

        const result = await checkConflicts(repository, objects);
        expect(client.mget).toHaveBeenCalledTimes(1);
        expect(result).toEqual({
          errors: [
            { ...unknownTypeObj, error: createUnsupportedTypeErrorPayload(unknownTypeObj.type) },
            { ...hiddenTypeObj, error: createUnsupportedTypeErrorPayload(hiddenTypeObj.type) },
            { ...obj1, error: createConflictErrorPayload(obj1.type, obj1.id) },
            // obj2 was not found so it does not result in a conflict error
            { ...obj3, error: createConflictErrorPayload(obj3.type, obj3.id) },
            {
              ...obj4,
              error: {
                ...createConflictErrorPayload(obj4.type, obj4.id),
                metadata: { isNotOverwritable: true },
              },
            },
            // obj5 was not found so it does not result in a conflict error
            { ...obj6, error: createConflictErrorPayload(obj6.type, obj6.id) },
            // obj7 was not found so it does not result in a conflict error
          ],
        });
      });
    });
  });
});
