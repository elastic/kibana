/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HttpSetup } from '@kbn/core/public';
import type { CPSProject, ProjectTagsResponse } from '@kbn/cps-utils';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { CACHE_TTL_MS, createProjectFetcher } from './project_fetcher';

describe('createProjectFetcher', () => {
  let mockHttp: jest.Mocked<HttpSetup>;
  const mockLogger = loggingSystemMock.createLogger();

  const mockOriginProject: CPSProject = {
    _id: 'origin-id',
    _alias: 'Origin Project',
    _type: 'observability',
    _organisation: 'org-1',
  };

  const mockLinkedProjects: CPSProject[] = [
    {
      _id: 'linked-1',
      _alias: 'B Project',
      _type: 'security',
      _organisation: 'org-2',
    },
    {
      _id: 'linked-2',
      _alias: 'A Project',
      _type: 'elasticsearch',
      _organisation: 'org-3',
    },
  ];

  const mockResponse: ProjectTagsResponse = {
    origin: { 'origin-id': mockOriginProject },
    linked_projects: {
      'linked-1': mockLinkedProjects[0],
      'linked-2': mockLinkedProjects[1],
    },
  };

  beforeEach(() => {
    jest.useFakeTimers();

    mockHttp = {
      post: jest.fn().mockResolvedValue(mockResponse),
    } as unknown as jest.Mocked<HttpSetup>;
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('basic fetch', () => {
    it('should fetch and return parsed projects data', async () => {
      const fetcher = createProjectFetcher(mockHttp, mockLogger);
      const result = await fetcher.fetchProjects('_alias:*');

      expect(mockHttp.post).toHaveBeenCalledTimes(1);
      expect(mockHttp.post).toHaveBeenCalledWith('/internal/cps/projects_tags', {
        body: JSON.stringify({ project_routing: '_alias:*' }),
      });
      expect(result).toEqual({
        origin: mockOriginProject,
        linkedProjects: [mockLinkedProjects[1], mockLinkedProjects[0]],
      });
    });

    it('should send empty body when no project routing is provided', async () => {
      const fetcher = createProjectFetcher(mockHttp, mockLogger);
      await fetcher.fetchProjects();

      expect(mockHttp.post).toHaveBeenCalledWith('/internal/cps/projects_tags', {
        body: JSON.stringify({}),
      });
    });

    it('should sort linked projects by alias', async () => {
      const fetcher = createProjectFetcher(mockHttp, mockLogger);
      const result = await fetcher.fetchProjects('_alias:*');

      expect(result!.linkedProjects[0]._alias).toBe('A Project');
      expect(result!.linkedProjects[1]._alias).toBe('B Project');
    });
  });

  describe('retry logic', () => {
    it('should retry on failure with exponential backoff', async () => {
      mockHttp.post
        .mockRejectedValueOnce(new Error('Error 1'))
        .mockRejectedValueOnce(new Error('Error 2'))
        .mockResolvedValueOnce(mockResponse);

      const fetcher = createProjectFetcher(mockHttp, mockLogger);
      const promise = fetcher.fetchProjects('_alias:*');
      const timerPromise = jest.runAllTimersAsync();
      const [result] = await Promise.all([promise, timerPromise]);

      expect(mockHttp.post).toHaveBeenCalledTimes(3);
      expect(result!.origin).toEqual(mockOriginProject);
    });

    it('should throw after max retries exceeded', async () => {
      mockHttp.post.mockRejectedValue(new Error('Persistent error'));

      const fetcher = createProjectFetcher(mockHttp, mockLogger);
      const promise = fetcher.fetchProjects('_alias:*');
      const timerPromise = jest.runAllTimersAsync();

      await expect(Promise.all([promise, timerPromise])).rejects.toThrow('Persistent error');
      expect(mockHttp.post).toHaveBeenCalledTimes(3);
    });
  });

  describe('TTL cache', () => {
    it('should return cached data on second call within TTL window', async () => {
      const fetcher = createProjectFetcher(mockHttp, mockLogger);

      const result1 = await fetcher.fetchProjects('_alias:*');
      const result2 = await fetcher.fetchProjects('_alias:*');

      expect(mockHttp.post).toHaveBeenCalledTimes(1);
      expect(result2).toEqual(result1);
    });

    it('should fetch fresh data after TTL expires', async () => {
      const fetcher = createProjectFetcher(mockHttp, mockLogger);

      await fetcher.fetchProjects('_alias:*');
      expect(mockHttp.post).toHaveBeenCalledTimes(1);

      jest.advanceTimersByTime(CACHE_TTL_MS - 1);

      await fetcher.fetchProjects('_alias:*');
      expect(mockHttp.post).toHaveBeenCalledTimes(1);

      jest.advanceTimersByTime(CACHE_TTL_MS + 1);

      await fetcher.fetchProjects('_alias:*');
      expect(mockHttp.post).toHaveBeenCalledTimes(2);
    });

    it('should cache different routing keys independently', async () => {
      const fetcher = createProjectFetcher(mockHttp, mockLogger);

      await fetcher.fetchProjects('_alias:*');
      await fetcher.fetchProjects('_alias:_origin');

      expect(mockHttp.post).toHaveBeenCalledTimes(2);

      await fetcher.fetchProjects('_alias:*');
      await fetcher.fetchProjects('_alias:_origin');

      expect(mockHttp.post).toHaveBeenCalledTimes(2);
    });

    it('should not cache errors', async () => {
      mockHttp.post
        .mockRejectedValueOnce(new Error('Transient error'))
        .mockRejectedValueOnce(new Error('Transient error'))
        .mockRejectedValueOnce(new Error('Transient error'))
        .mockResolvedValueOnce(mockResponse);

      const fetcher = createProjectFetcher(mockHttp, mockLogger);

      const failedPromise = fetcher.fetchProjects('_alias:*');
      const timerPromise = jest.runAllTimersAsync();
      await expect(Promise.all([failedPromise, timerPromise])).rejects.toThrow('Transient error');

      const result = await fetcher.fetchProjects('_alias:*');
      expect(result!.origin).toEqual(mockOriginProject);
    });
  });

  describe('in-flight deduplication', () => {
    it('should share a single HTTP request for concurrent calls with the same routing', async () => {
      let resolvePost: (value: ProjectTagsResponse) => void;
      mockHttp.post.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolvePost = resolve;
          })
      );

      const fetcher = createProjectFetcher(mockHttp, mockLogger);

      const promise1 = fetcher.fetchProjects('_alias:*');
      const promise2 = fetcher.fetchProjects('_alias:*');

      resolvePost!(mockResponse);

      const [result1, result2] = await Promise.all([promise1, promise2]);

      expect(mockHttp.post).toHaveBeenCalledTimes(1);
      expect(result1).toEqual(result2);
    });

    it('should make separate HTTP requests for concurrent calls with different routing', async () => {
      const fetcher = createProjectFetcher(mockHttp, mockLogger);

      const promise1 = fetcher.fetchProjects('_alias:*');
      const promise2 = fetcher.fetchProjects('_alias:_origin');

      await Promise.all([promise1, promise2]);

      expect(mockHttp.post).toHaveBeenCalledTimes(2);
    });

    it('should populate the cache after in-flight dedup resolves', async () => {
      let resolvePost: (value: ProjectTagsResponse) => void;
      mockHttp.post.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolvePost = resolve;
          })
      );

      const fetcher = createProjectFetcher(mockHttp, mockLogger);

      const promise1 = fetcher.fetchProjects('_alias:*');
      const promise2 = fetcher.fetchProjects('_alias:*');

      resolvePost!(mockResponse);
      await Promise.all([promise1, promise2]);

      const result3 = await fetcher.fetchProjects('_alias:*');

      expect(mockHttp.post).toHaveBeenCalledTimes(1);
      expect(result3!.origin).toEqual(mockOriginProject);
    });
  });
});
