/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/* eslint-disable @typescript-eslint/no-shadow */

import {
  pointInTimeFinderMock,
  mockGetCurrentTime,
  mockGetSearchDsl,
} from '../repository.test.mock';

import type {
  SavedObjectsCreatePointInTimeFinderDependencies,
  SavedObjectsCreatePointInTimeFinderOptions,
  SavedObjectsOpenPointInTimeOptions,
} from '@kbn/core-saved-objects-api-server';
import { SavedObjectsRepository } from '../repository';
import { loggerMock } from '@kbn/logging-mocks';
import { SavedObjectsSerializer } from '@kbn/core-saved-objects-base-server-internal';
import { kibanaMigratorMock } from '../../mocks';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';

import {
  HIDDEN_TYPE,
  mockTimestamp,
  mappings,
  createRegistry,
  createDocumentMigrator,
  createSpySerializer,
  createGenericNotFoundErrorPayload,
} from '../../test_helpers/repository.test.common';
import { PointInTimeFinder } from '../point_in_time_finder';

describe('SavedObjectsRepository', () => {
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

  describe('#openPointInTimeForType', () => {
    const type = 'index-pattern';

    const generateResults = (id?: string) => ({ id: id || 'id' });
    const successResponse = async (type: string, options?: SavedObjectsOpenPointInTimeOptions) => {
      client.openPointInTime.mockResponseOnce(generateResults());
      const result = await repository.openPointInTimeForType(type, options);
      expect(client.openPointInTime).toHaveBeenCalledTimes(1);
      return result;
    };

    describe('client calls', () => {
      it(`should use the ES PIT API`, async () => {
        await successResponse(type);
        expect(client.openPointInTime).toHaveBeenCalledTimes(1);
      });

      it(`accepts preference`, async () => {
        await successResponse(type, { preference: 'pref' });
        expect(client.openPointInTime).toHaveBeenCalledWith(
          expect.objectContaining({
            preference: 'pref',
          }),
          expect.anything()
        );
      });

      it(`accepts keepAlive`, async () => {
        await successResponse(type, { keepAlive: '2m' });
        expect(client.openPointInTime).toHaveBeenCalledWith(
          expect.objectContaining({
            keep_alive: '2m',
          }),
          expect.anything()
        );
      });

      it(`defaults keepAlive to 5m`, async () => {
        await successResponse(type);
        expect(client.openPointInTime).toHaveBeenCalledWith(
          expect.objectContaining({
            keep_alive: '5m',
          }),
          expect.anything()
        );
      });
    });

    describe('errors', () => {
      const expectNotFoundError = async (types: string | string[]) => {
        await expect(repository.openPointInTimeForType(types)).rejects.toThrowError(
          createGenericNotFoundErrorPayload()
        );
      };

      it(`throws when ES is unable to find the index`, async () => {
        client.openPointInTime.mockResolvedValueOnce(
          elasticsearchClientMock.createSuccessTransportRequestPromise(
            { id: 'error' },
            { statusCode: 404 }
          )
        );
        await expectNotFoundError(type);
        expect(client.openPointInTime).toHaveBeenCalledTimes(1);
      });

      it(`should return generic not found error when attempting to find only invalid or hidden types`, async () => {
        const test = async (types: string | string[]) => {
          await expectNotFoundError(types);
          expect(client.openPointInTime).not.toHaveBeenCalled();
        };

        await test('unknownType');
        await test(HIDDEN_TYPE);
        await test(['unknownType', HIDDEN_TYPE]);
      });
    });

    describe('returns', () => {
      it(`returns id in the expected format`, async () => {
        const id = 'abc123';
        const results = generateResults(id);
        client.openPointInTime.mockResolvedValueOnce(
          elasticsearchClientMock.createSuccessTransportRequestPromise(results)
        );
        const response = await repository.openPointInTimeForType(type);
        expect(response).toEqual({ id });
      });
    });
  });

  describe('#closePointInTime', () => {
    const generateResults = () => ({ succeeded: true, num_freed: 3 });
    const successResponse = async (id: string) => {
      client.closePointInTime.mockResponseOnce(generateResults());
      const result = await repository.closePointInTime(id);
      expect(client.closePointInTime).toHaveBeenCalledTimes(1);
      return result;
    };

    describe('client calls', () => {
      it(`should use the ES PIT API`, async () => {
        await successResponse('abc123');
        expect(client.closePointInTime).toHaveBeenCalledTimes(1);
      });

      it(`accepts id`, async () => {
        await successResponse('abc123');
        expect(client.closePointInTime).toHaveBeenCalledWith(
          expect.objectContaining({
            body: expect.objectContaining({
              id: 'abc123',
            }),
          }),
          expect.anything()
        );
      });
    });

    describe('returns', () => {
      it(`returns response body from ES`, async () => {
        const results = generateResults();
        client.closePointInTime.mockResponseOnce(results);
        const response = await repository.closePointInTime('abc123');
        expect(response).toEqual(results);
      });
    });
  });

  describe('#createPointInTimeFinder', () => {
    it('returns a new PointInTimeFinder instance', async () => {
      const result = await repository.createPointInTimeFinder({ type: 'PIT' });
      expect(result).toBeInstanceOf(PointInTimeFinder);
    });

    it('calls PointInTimeFinder with the provided options and dependencies', async () => {
      const options: SavedObjectsCreatePointInTimeFinderOptions = {
        type: 'my-type',
      };
      const dependencies: SavedObjectsCreatePointInTimeFinderDependencies = {
        client: {
          find: jest.fn(),
          openPointInTimeForType: jest.fn(),
          closePointInTime: jest.fn(),
        },
      };

      await repository.createPointInTimeFinder(options, dependencies);
      expect(pointInTimeFinderMock).toHaveBeenCalledWith(
        options,
        expect.objectContaining({
          ...dependencies,
          logger,
        })
      );
    });
  });
});
