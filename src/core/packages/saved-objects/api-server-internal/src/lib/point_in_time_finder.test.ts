/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { loggerMock, type MockedLogger } from '@kbn/logging-mocks';
import type {
  SavedObjectsFindResult,
  SavedObjectsCreatePointInTimeFinderOptions,
} from '@kbn/core-saved-objects-api-server';
import { savedObjectsPointInTimeFinderMock } from '../mocks';

import { PointInTimeFinder } from './point_in_time_finder';

const mockHits = [
  {
    id: '2',
    type: 'search',
    attributes: {},
    score: 1,
    references: [
      {
        name: 'name',
        type: 'visualization',
        id: '1',
      },
    ],
    sort: [],
  },
  {
    id: '1',
    type: 'visualization',
    attributes: {},
    score: 1,
    references: [],
    sort: [],
  },
];

describe('createPointInTimeFinder()', () => {
  let logger: MockedLogger;
  let repository: ReturnType<typeof savedObjectsPointInTimeFinderMock.createClient>;

  beforeEach(() => {
    logger = loggerMock.create();
    repository = savedObjectsPointInTimeFinderMock.createClient();
  });

  describe('#find', () => {
    test('opens a PIT with the correct parameters', async () => {
      repository.openPointInTimeForType.mockResolvedValueOnce({
        id: 'abc123',
      });
      repository.find.mockResolvedValue({
        total: 2,
        saved_objects: mockHits,
        pit_id: 'abc123',
        per_page: 1,
        page: 0,
      });

      const findOptions: SavedObjectsCreatePointInTimeFinderOptions = {
        type: ['visualization'],
        search: 'foo*',
        perPage: 1,
        namespaces: ['ns1', 'ns2'],
      };

      const internalOptions = {};
      const finder = new PointInTimeFinder(findOptions, {
        logger,
        client: repository,
        internalOptions,
      });

      expect(repository.openPointInTimeForType).not.toHaveBeenCalled();

      await finder.find().next();

      expect(repository.openPointInTimeForType).toHaveBeenCalledTimes(1);
      expect(repository.openPointInTimeForType).toHaveBeenCalledWith(
        findOptions.type,
        { namespaces: findOptions.namespaces },
        internalOptions
      );
    });
  });

  test('throws if a PIT is already open', async () => {
    repository.openPointInTimeForType.mockResolvedValueOnce({
      id: 'abc123',
    });
    repository.find
      .mockResolvedValueOnce({
        total: 2,
        saved_objects: mockHits,
        pit_id: 'abc123',
        per_page: 1,
        page: 0,
      })
      .mockResolvedValueOnce({
        total: 2,
        saved_objects: mockHits,
        pit_id: 'abc123',
        per_page: 1,
        page: 1,
      });

    const findOptions: SavedObjectsCreatePointInTimeFinderOptions = {
      type: ['visualization'],
      search: 'foo*',
      perPage: 1,
    };

    const finder = new PointInTimeFinder(findOptions, {
      logger,
      client: repository,
    });
    await finder.find().next();

    expect(repository.find).toHaveBeenCalledTimes(1);

    expect(async () => {
      await finder.find().next();
    }).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Point In Time has already been opened for this finder instance. Please call \`close()\` before calling \`find()\` again."`
    );
    expect(repository.find).toHaveBeenCalledTimes(1);
  });

  test('works with a single page of results', async () => {
    repository.openPointInTimeForType.mockResolvedValueOnce({
      id: 'abc123',
    });
    repository.find.mockResolvedValueOnce({
      total: 2,
      saved_objects: mockHits,
      pit_id: 'abc123',
      per_page: 2,
      page: 0,
    });

    const findOptions: SavedObjectsCreatePointInTimeFinderOptions = {
      type: ['visualization'],
      search: 'foo*',
    };

    const internalOptions = {};
    const finder = new PointInTimeFinder(findOptions, {
      logger,
      client: repository,
      internalOptions,
    });
    const hits: SavedObjectsFindResult[] = [];
    for await (const result of finder.find()) {
      hits.push(...result.saved_objects);
    }

    expect(hits.length).toBe(2);
    expect(repository.openPointInTimeForType).toHaveBeenCalledTimes(1);
    expect(repository.closePointInTime).toHaveBeenCalledTimes(1);
    expect(repository.find).toHaveBeenCalledTimes(1);
    expect(repository.find).toHaveBeenCalledWith(
      expect.objectContaining({
        pit: expect.objectContaining({ id: 'abc123', keepAlive: '2m' }),
        sortField: 'updated_at',
        sortOrder: 'desc',
        type: ['visualization'],
      }),
      internalOptions
    );
  });

  test('works with multiple pages of results', async () => {
    repository.openPointInTimeForType.mockResolvedValueOnce({
      id: 'abc123',
    });
    repository.find
      .mockResolvedValueOnce({
        total: 2,
        saved_objects: [mockHits[0]],
        pit_id: 'abc123',
        per_page: 1,
        page: 0,
      })
      .mockResolvedValueOnce({
        total: 2,
        saved_objects: [mockHits[1]],
        pit_id: 'abc123',
        per_page: 1,
        page: 0,
      });
    repository.find.mockResolvedValueOnce({
      total: 2,
      saved_objects: [],
      per_page: 1,
      pit_id: 'abc123',
      page: 0,
    });

    const findOptions: SavedObjectsCreatePointInTimeFinderOptions = {
      type: ['visualization'],
      search: 'foo*',
      perPage: 1,
    };

    const internalOptions = {};
    const finder = new PointInTimeFinder(findOptions, {
      logger,
      client: repository,
      internalOptions,
    });
    const hits: SavedObjectsFindResult[] = [];
    for await (const result of finder.find()) {
      hits.push(...result.saved_objects);
    }

    expect(hits.length).toBe(2);
    expect(repository.openPointInTimeForType).toHaveBeenCalledTimes(1);
    expect(repository.closePointInTime).toHaveBeenCalledTimes(1);
    // called 3 times since we need a 3rd request to check if we
    // are done paginating through results.
    expect(repository.find).toHaveBeenCalledTimes(3);
    expect(repository.find).toHaveBeenCalledWith(
      expect.objectContaining({
        pit: expect.objectContaining({ id: 'abc123', keepAlive: '2m' }),
        sortField: 'updated_at',
        sortOrder: 'desc',
        type: ['visualization'],
      }),
      internalOptions
    );
  });

  test('does not yield empty first page', async () => {
    repository.openPointInTimeForType.mockResolvedValueOnce({
      id: 'abc123',
    });
    repository.find.mockResolvedValueOnce({
      total: 2,
      saved_objects: [],
      pit_id: 'abc123',
      per_page: 2,
      page: 0,
    });

    const findOptions: SavedObjectsCreatePointInTimeFinderOptions = {
      type: ['visualization'],
      search: 'foo*',
    };

    const internalOptions = {};
    const finder = new PointInTimeFinder(findOptions, {
      logger,
      client: repository,
      internalOptions,
    });

    const hits: SavedObjectsFindResult[] = [];
    let pageCount = 0;
    for await (const result of finder.find()) {
      hits.push(...result.saved_objects);
      pageCount++;
    }

    expect(pageCount).toEqual(0);
    expect(hits.length).toEqual(0);
  });

  test('yields empty first page if aggregations are used', async () => {
    repository.openPointInTimeForType.mockResolvedValueOnce({
      id: 'abc123',
    });
    repository.find.mockResolvedValueOnce({
      total: 2,
      saved_objects: [],
      pit_id: 'abc123',
      per_page: 2,
      page: 0,
    });

    const findOptions: SavedObjectsCreatePointInTimeFinderOptions = {
      type: ['visualization'],
      search: 'foo*',
      aggs: {
        some: {
          avg: { field: 'fo' },
        },
      },
    };

    const internalOptions = {};
    const finder = new PointInTimeFinder(findOptions, {
      logger,
      client: repository,
      internalOptions,
    });

    const hits: SavedObjectsFindResult[] = [];
    let pageCount = 0;
    for await (const result of finder.find()) {
      hits.push(...result.saved_objects);
      pageCount++;
    }

    expect(pageCount).toEqual(1);
    expect(hits.length).toEqual(0);
  });

  test('still applies the defaults in the mandatory fields even when `undefined` is explicitly provided', async () => {
    repository.openPointInTimeForType.mockResolvedValueOnce({
      id: 'abc123',
    });
    repository.find.mockResolvedValueOnce({
      total: 2,
      saved_objects: mockHits,
      pit_id: 'abc123',
      per_page: 2,
      page: 0,
    });

    const findOptions: SavedObjectsCreatePointInTimeFinderOptions = {
      type: ['visualization'],
      search: 'foo*',
      // Intentionally trying to remove the sort fields
      sortField: undefined,
      sortOrder: undefined,
    };

    const internalOptions = {};
    const finder = new PointInTimeFinder(findOptions, {
      logger,
      client: repository,
      internalOptions,
    });
    const hits: SavedObjectsFindResult[] = [];
    for await (const result of finder.find()) {
      hits.push(...result.saved_objects);
    }

    expect(hits.length).toBe(2);
    expect(repository.openPointInTimeForType).toHaveBeenCalledTimes(1);
    expect(repository.closePointInTime).toHaveBeenCalledTimes(1);
    expect(repository.find).toHaveBeenCalledTimes(1);
    expect(repository.find).toHaveBeenCalledWith(
      expect.objectContaining({
        pit: expect.objectContaining({ id: 'abc123', keepAlive: '2m' }),
        sortField: 'updated_at',
        sortOrder: 'desc',
        type: ['visualization'],
      }),
      internalOptions
    );
  });

  describe('#close', () => {
    test('calls closePointInTime with correct ID', async () => {
      repository.openPointInTimeForType.mockResolvedValueOnce({
        id: 'test',
      });
      repository.find.mockResolvedValueOnce({
        total: 1,
        saved_objects: [mockHits[0]],
        pit_id: 'test',
        per_page: 1,
        page: 0,
      });

      const findOptions: SavedObjectsCreatePointInTimeFinderOptions = {
        type: ['visualization'],
        search: 'foo*',
        perPage: 2,
      };

      const internalOptions = {};
      const finder = new PointInTimeFinder(findOptions, {
        logger,
        client: repository,
        internalOptions,
      });
      const hits: SavedObjectsFindResult[] = [];
      for await (const result of finder.find()) {
        hits.push(...result.saved_objects);
        await finder.close();
      }

      expect(repository.closePointInTime).toHaveBeenCalledWith('test', undefined, internalOptions);
    });

    test('causes generator to stop', async () => {
      repository.openPointInTimeForType.mockResolvedValueOnce({
        id: 'test',
      });
      repository.find.mockResolvedValueOnce({
        total: 2,
        saved_objects: [mockHits[0]],
        pit_id: 'test',
        per_page: 1,
        page: 0,
      });
      repository.find.mockResolvedValueOnce({
        total: 2,
        saved_objects: [mockHits[1]],
        pit_id: 'test',
        per_page: 1,
        page: 0,
      });
      repository.find.mockResolvedValueOnce({
        total: 2,
        saved_objects: [],
        per_page: 1,
        pit_id: 'test',
        page: 0,
      });

      const findOptions: SavedObjectsCreatePointInTimeFinderOptions = {
        type: ['visualization'],
        search: 'foo*',
        perPage: 1,
      };

      const finder = new PointInTimeFinder(findOptions, {
        logger,
        client: repository,
      });
      const hits: SavedObjectsFindResult[] = [];
      for await (const result of finder.find()) {
        hits.push(...result.saved_objects);
        await finder.close();
      }

      expect(repository.closePointInTime).toHaveBeenCalledTimes(1);
      expect(hits.length).toBe(1);
    });

    test('is called if `find` throws an error', async () => {
      repository.openPointInTimeForType.mockResolvedValueOnce({
        id: 'test',
      });
      repository.find.mockRejectedValueOnce(new Error('oops'));

      const findOptions: SavedObjectsCreatePointInTimeFinderOptions = {
        type: ['visualization'],
        search: 'foo*',
        perPage: 2,
      };

      const internalOptions = {};
      const finder = new PointInTimeFinder(findOptions, {
        logger,
        client: repository,
        internalOptions,
      });
      const hits: SavedObjectsFindResult[] = [];
      try {
        for await (const result of finder.find()) {
          hits.push(...result.saved_objects);
        }
      } catch (e) {
        // intentionally empty
      }

      expect(repository.closePointInTime).toHaveBeenCalledWith('test', undefined, internalOptions);
    });

    test('finder can be reused after closing', async () => {
      repository.openPointInTimeForType
        .mockResolvedValueOnce({
          id: 'abc123',
        })
        .mockResolvedValueOnce({
          id: 'abc456',
        });
      repository.find
        .mockResolvedValueOnce({
          total: 2,
          saved_objects: mockHits,
          pit_id: 'abc123',
          per_page: 1,
          page: 0,
        })
        .mockResolvedValueOnce({
          total: 2,
          saved_objects: mockHits,
          pit_id: 'abc123',
          per_page: 1,
          page: 1,
        });

      const findOptions: SavedObjectsCreatePointInTimeFinderOptions = {
        type: ['visualization'],
        search: 'foo*',
        perPage: 1,
      };

      const finder = new PointInTimeFinder(findOptions, {
        logger,
        client: repository,
      });

      const findA = finder.find();
      await findA.next();
      await finder.close();

      const findB = finder.find();
      await findB.next();
      await finder.close();

      expect((await findA.next()).done).toBe(true);
      expect((await findB.next()).done).toBe(true);
      expect(repository.openPointInTimeForType).toHaveBeenCalledTimes(2);
      expect(repository.find).toHaveBeenCalledTimes(2);
      expect(repository.closePointInTime).toHaveBeenCalledTimes(2);
    });
  });
});
