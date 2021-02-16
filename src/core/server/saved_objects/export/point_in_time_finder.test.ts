/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { savedObjectsClientMock } from '../service/saved_objects_client.mock';
import { loggerMock, MockedLogger } from '../../logging/logger.mock';
import { SavedObjectsFindOptions } from '../types';
import { SavedObjectsFindResult } from '../service';

import { createPointInTimeFinder } from './point_in_time_finder';

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
  let savedObjectsClient: ReturnType<typeof savedObjectsClientMock.create>;

  beforeEach(() => {
    logger = loggerMock.create();
    savedObjectsClient = savedObjectsClientMock.create();
  });

  describe('#find', () => {
    test('throws if a PIT is already open', async () => {
      savedObjectsClient.openPointInTimeForType.mockResolvedValueOnce({
        id: 'abc123',
      });
      savedObjectsClient.find.mockResolvedValueOnce({
        total: 2,
        saved_objects: mockHits,
        pit_id: 'abc123',
        per_page: 1,
        page: 0,
      });
      savedObjectsClient.find.mockResolvedValueOnce({
        total: 2,
        saved_objects: mockHits,
        pit_id: 'abc123',
        per_page: 1,
        page: 1,
      });

      const findOptions: SavedObjectsFindOptions = {
        type: ['visualization'],
        search: 'foo*',
        perPage: 1,
      };

      const finder = createPointInTimeFinder({ findOptions, logger, savedObjectsClient });
      await finder.find().next();

      expect(savedObjectsClient.find).toHaveBeenCalledTimes(1);
      savedObjectsClient.find.mockClear();

      expect(async () => {
        await finder.find().next();
      }).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Point In Time has already been opened for this finder instance. Please call \`close()\` before calling \`find()\` again."`
      );
      expect(savedObjectsClient.find).toHaveBeenCalledTimes(0);
    });

    test('works with a single page of results', async () => {
      savedObjectsClient.openPointInTimeForType.mockResolvedValueOnce({
        id: 'abc123',
      });
      savedObjectsClient.find.mockResolvedValueOnce({
        total: 2,
        saved_objects: mockHits,
        pit_id: 'abc123',
        per_page: 2,
        page: 0,
      });

      const findOptions: SavedObjectsFindOptions = {
        type: ['visualization'],
        search: 'foo*',
      };

      const finder = createPointInTimeFinder({ findOptions, logger, savedObjectsClient });
      const hits: SavedObjectsFindResult[] = [];
      for await (const result of finder.find()) {
        hits.push(...result.saved_objects);
      }

      expect(hits.length).toBe(2);
      expect(savedObjectsClient.openPointInTimeForType).toHaveBeenCalledTimes(1);
      expect(savedObjectsClient.closePointInTime).toHaveBeenCalledTimes(1);
      expect(savedObjectsClient.find).toHaveBeenCalledTimes(1);
      expect(savedObjectsClient.find).toHaveBeenCalledWith(
        expect.objectContaining({
          pit: expect.objectContaining({ id: 'abc123', keepAlive: '2m' }),
          sortField: 'updated_at',
          sortOrder: 'desc',
          type: ['visualization'],
        })
      );
    });

    test('works with multiple pages of results', async () => {
      savedObjectsClient.openPointInTimeForType.mockResolvedValueOnce({
        id: 'abc123',
      });
      savedObjectsClient.find.mockResolvedValueOnce({
        total: 2,
        saved_objects: [mockHits[0]],
        pit_id: 'abc123',
        per_page: 1,
        page: 0,
      });
      savedObjectsClient.find.mockResolvedValueOnce({
        total: 2,
        saved_objects: [mockHits[1]],
        pit_id: 'abc123',
        per_page: 1,
        page: 0,
      });
      savedObjectsClient.find.mockResolvedValueOnce({
        total: 2,
        saved_objects: [],
        per_page: 1,
        pit_id: 'abc123',
        page: 0,
      });

      const findOptions: SavedObjectsFindOptions = {
        type: ['visualization'],
        search: 'foo*',
        perPage: 1,
      };

      const finder = createPointInTimeFinder({ findOptions, logger, savedObjectsClient });
      const hits: SavedObjectsFindResult[] = [];
      for await (const result of finder.find()) {
        hits.push(...result.saved_objects);
      }

      expect(hits.length).toBe(2);
      expect(savedObjectsClient.openPointInTimeForType).toHaveBeenCalledTimes(1);
      expect(savedObjectsClient.closePointInTime).toHaveBeenCalledTimes(1);
      // called 3 times since we need a 3rd request to check if we
      // are done paginating through results.
      expect(savedObjectsClient.find).toHaveBeenCalledTimes(3);
      expect(savedObjectsClient.find).toHaveBeenCalledWith(
        expect.objectContaining({
          pit: expect.objectContaining({ id: 'abc123', keepAlive: '2m' }),
          sortField: 'updated_at',
          sortOrder: 'desc',
          type: ['visualization'],
        })
      );
    });
  });

  describe('#close', () => {
    test('calls closePointInTime with correct ID', async () => {
      savedObjectsClient.openPointInTimeForType.mockResolvedValueOnce({
        id: 'test',
      });
      savedObjectsClient.find.mockResolvedValueOnce({
        total: 1,
        saved_objects: [mockHits[0]],
        pit_id: 'test',
        per_page: 1,
        page: 0,
      });

      const findOptions: SavedObjectsFindOptions = {
        type: ['visualization'],
        search: 'foo*',
        perPage: 2,
      };

      const finder = createPointInTimeFinder({ findOptions, logger, savedObjectsClient });
      const hits: SavedObjectsFindResult[] = [];
      for await (const result of finder.find()) {
        hits.push(...result.saved_objects);
        await finder.close();
      }

      expect(savedObjectsClient.closePointInTime).toHaveBeenCalledWith('test');
    });

    test('causes generator to stop', async () => {
      savedObjectsClient.openPointInTimeForType.mockResolvedValueOnce({
        id: 'test',
      });
      savedObjectsClient.find.mockResolvedValueOnce({
        total: 2,
        saved_objects: [mockHits[0]],
        pit_id: 'test',
        per_page: 1,
        page: 0,
      });
      savedObjectsClient.find.mockResolvedValueOnce({
        total: 2,
        saved_objects: [mockHits[1]],
        pit_id: 'test',
        per_page: 1,
        page: 0,
      });
      savedObjectsClient.find.mockResolvedValueOnce({
        total: 2,
        saved_objects: [],
        per_page: 1,
        pit_id: 'test',
        page: 0,
      });

      const findOptions: SavedObjectsFindOptions = {
        type: ['visualization'],
        search: 'foo*',
        perPage: 1,
      };

      const finder = createPointInTimeFinder({ findOptions, logger, savedObjectsClient });
      const hits: SavedObjectsFindResult[] = [];
      for await (const result of finder.find()) {
        hits.push(...result.saved_objects);
        await finder.close();
      }

      expect(savedObjectsClient.closePointInTime).toHaveBeenCalledTimes(1);
      expect(hits.length).toBe(1);
    });

    test('is called if `find` throws an error', async () => {
      savedObjectsClient.openPointInTimeForType.mockResolvedValueOnce({
        id: 'test',
      });
      savedObjectsClient.find.mockRejectedValueOnce(new Error('oops'));

      const findOptions: SavedObjectsFindOptions = {
        type: ['visualization'],
        search: 'foo*',
        perPage: 2,
      };

      const finder = createPointInTimeFinder({ findOptions, logger, savedObjectsClient });
      const hits: SavedObjectsFindResult[] = [];
      try {
        for await (const result of finder.find()) {
          hits.push(...result.saved_objects);
        }
      } catch (e) {
        // intentionally empty
      }

      expect(savedObjectsClient.closePointInTime).toHaveBeenCalledWith('test');
    });

    test('finder can be reused after closing', async () => {
      savedObjectsClient.openPointInTimeForType.mockResolvedValueOnce({
        id: 'abc123',
      });
      savedObjectsClient.find.mockResolvedValueOnce({
        total: 2,
        saved_objects: mockHits,
        pit_id: 'abc123',
        per_page: 1,
        page: 0,
      });
      savedObjectsClient.find.mockResolvedValueOnce({
        total: 2,
        saved_objects: mockHits,
        pit_id: 'abc123',
        per_page: 1,
        page: 1,
      });

      const findOptions: SavedObjectsFindOptions = {
        type: ['visualization'],
        search: 'foo*',
        perPage: 1,
      };

      const finder = createPointInTimeFinder({ findOptions, logger, savedObjectsClient });

      const findA = finder.find();
      await findA.next();
      await finder.close();

      const findB = finder.find();
      await findB.next();
      await finder.close();

      expect((await findA.next()).done).toBe(true);
      expect((await findB.next()).done).toBe(true);
      expect(savedObjectsClient.openPointInTimeForType).toHaveBeenCalledTimes(2);
      expect(savedObjectsClient.find).toHaveBeenCalledTimes(2);
      expect(savedObjectsClient.closePointInTime).toHaveBeenCalledTimes(2);
    });
  });
});
