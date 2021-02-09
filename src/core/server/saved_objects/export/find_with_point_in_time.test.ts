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

import type { FindWithPointInTime } from './find_with_point_in_time';
import { findWithPointInTime } from './find_with_point_in_time';

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

describe('findWithPointInTime()', () => {
  let logger: MockedLogger;
  let savedObjectsClient: ReturnType<typeof savedObjectsClientMock.create>;
  let finder: FindWithPointInTime;

  beforeEach(() => {
    logger = loggerMock.create();
    savedObjectsClient = savedObjectsClientMock.create();
    finder = findWithPointInTime({ savedObjectsClient, logger });
  });

  describe('#find', () => {
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

      const options: SavedObjectsFindOptions = {
        type: ['visualization'],
        search: 'foo*',
      };

      const hits: SavedObjectsFindResult[] = [];
      for await (const result of finder.find(options)) {
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

      const options: SavedObjectsFindOptions = {
        type: ['visualization'],
        search: 'foo*',
        perPage: 1,
      };

      const hits: SavedObjectsFindResult[] = [];
      for await (const result of finder.find(options)) {
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

      const options: SavedObjectsFindOptions = {
        type: ['visualization'],
        search: 'foo*',
        perPage: 2,
      };

      const hits: SavedObjectsFindResult[] = [];
      for await (const result of finder.find(options)) {
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

      const options: SavedObjectsFindOptions = {
        type: ['visualization'],
        search: 'foo*',
        perPage: 1,
      };

      const hits: SavedObjectsFindResult[] = [];
      for await (const result of finder.find(options)) {
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

      const options: SavedObjectsFindOptions = {
        type: ['visualization'],
        search: 'foo*',
        perPage: 2,
      };

      const hits: SavedObjectsFindResult[] = [];
      try {
        for await (const result of finder.find(options)) {
          hits.push(...result.saved_objects);
        }
      } catch (e) {
        // intentionally empty
      }

      expect(savedObjectsClient.closePointInTime).toHaveBeenCalledWith('test');
    });
  });
});
