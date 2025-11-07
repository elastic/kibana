/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { CPSManager } from './cps_manager';
import type { HttpSetup } from '@kbn/core/public';
import type { Project, ProjectTagsResponse } from '../types';

describe('CPSManager', () => {
  let mockHttp: jest.Mocked<HttpSetup>;
  let cpsManager: CPSManager;
  let consoleErrorSpy: jest.SpyInstance;

  const mockOriginProject: Project = {
    _id: 'origin-id',
    _alias: 'Origin Project',
    _type: 'observability',
    _csp: 'aws',
    _region: 'us-east-1',
  };

  const mockLinkedProjects: Project[] = [
    {
      _id: 'linked-1',
      _alias: 'B Project',
      _type: 'security',
      _csp: 'azure',
      _region: 'eastus',
    },
    {
      _id: 'linked-2',
      _alias: 'A Project',
      _type: 'elasticsearch',
      _csp: 'gcp',
      _region: 'us-central1',
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
    mockHttp = {
      get: jest.fn().mockResolvedValue(mockResponse),
    } as unknown as jest.Mocked<HttpSetup>;
    cpsManager = new CPSManager(mockHttp);
    // Suppress console.error for tests that expect errors
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy.mockRestore();
  });

  describe('initial state', () => {
    it('should initialize with empty projects', () => {
      const projects = cpsManager.getProjects();
      expect(projects).toEqual({
        origin: null,
        linkedProjects: [],
      });

      expect(cpsManager.hasLoadedProjects()).toBe(false);
    });
  });

  describe('fetchProjects', () => {
    it('should fetch and store projects successfully', async () => {
      const result = await cpsManager.fetchProjects();

      expect(mockHttp.get).toHaveBeenCalledWith('/internal/cps/projects_tags');
      expect(result).toEqual({
        origin: mockOriginProject,
        linkedProjects: [mockLinkedProjects[1], mockLinkedProjects[0]], // sorted by alias
      });
      expect(cpsManager.hasLoadedProjects()).toBe(true);
    });

    it('should sort linked projects by alias', async () => {
      const result = await cpsManager.fetchProjects();

      expect(result.linkedProjects[0]._alias).toBe('A Project');
      expect(result.linkedProjects[1]._alias).toBe('B Project');
    });

    it('should emit projects to observable', async () => {
      const subscription = jest.fn();
      cpsManager.projects$.subscribe(subscription);

      await cpsManager.fetchProjects();

      expect(subscription).toHaveBeenCalledWith({
        origin: mockOriginProject,
        linkedProjects: [mockLinkedProjects[1], mockLinkedProjects[0]],
      });
    });
  });

  describe('caching behavior', () => {
    it('should cache results and not refetch on subsequent calls', async () => {
      // First fetch
      await cpsManager.fetchProjects();
      expect(mockHttp.get).toHaveBeenCalledTimes(1);

      // Second fetch should return cached data without calling HTTP
      await cpsManager.fetchProjects();
      expect(mockHttp.get).toHaveBeenCalledTimes(1);
    });

    it('should not cache failed requests', async () => {
      jest.useFakeTimers();
      mockHttp.get.mockRejectedValue(new Error('Network error'));

      // First fetch fails - run all timers to completion
      const promise = cpsManager.fetchProjects();
      const timerPromise = jest.runAllTimersAsync();

      await expect(Promise.all([promise, timerPromise])).rejects.toThrow('Network error');

      expect(cpsManager.hasLoadedProjects()).toBe(false);
      expect(mockHttp.get).toHaveBeenCalledTimes(3); // initial + 2 retries

      jest.useRealTimers();
    });
  });

  describe('refresh', () => {
    it('should refetch data when refresh is called', async () => {
      mockHttp.get.mockResolvedValue(mockResponse);

      // First fetch
      await cpsManager.fetchProjects();
      expect(mockHttp.get).toHaveBeenCalledTimes(1);

      // Refresh should call HTTP again
      await cpsManager.refresh();
      expect(mockHttp.get).toHaveBeenCalledTimes(2);
    });

    it('should update cached data after refresh', async () => {
      const updatedProject: Project = {
        ...mockOriginProject,
        _alias: 'Updated Project',
      };
      const updatedResponse: ProjectTagsResponse = {
        origin: { 'origin-id': updatedProject },
        linked_projects: mockResponse.linked_projects,
      };

      mockHttp.get.mockResolvedValueOnce(mockResponse);
      mockHttp.get.mockResolvedValueOnce(updatedResponse);

      // First fetch
      const result1 = await cpsManager.fetchProjects();
      expect(result1.origin?._alias).toBe('Origin Project');

      // Refresh with new data
      const result2 = await cpsManager.refresh();
      expect(result2.origin?._alias).toBe('Updated Project');

      // Subsequent fetch should return updated cached data
      const result3 = await cpsManager.fetchProjects();
      expect(result3.origin?._alias).toBe('Updated Project');
      expect(mockHttp.get).toHaveBeenCalledTimes(2); // Only 2 calls, third was from cache
    });
  });

  describe('retry logic', () => {
    it('should retry on failure with exponential backoff', async () => {
      jest.useFakeTimers();
      mockHttp.get
        .mockRejectedValueOnce(new Error('Error 1'))
        .mockRejectedValueOnce(new Error('Error 2'))
        .mockResolvedValueOnce(mockResponse);

      const promise = cpsManager.fetchProjects();
      await jest.runAllTimersAsync();

      const result = await promise;

      expect(mockHttp.get).toHaveBeenCalledTimes(3); // initial + 2 retries
      expect(result.origin).toEqual(mockOriginProject);

      jest.useRealTimers();
    });

    it('should throw error after max retries exceeded', async () => {
      jest.useFakeTimers();
      mockHttp.get.mockRejectedValue(new Error('Persistent error'));

      const promise = cpsManager.fetchProjects();
      const timerPromise = jest.runAllTimersAsync();

      await expect(Promise.all([promise, timerPromise])).rejects.toThrow('Persistent error');

      expect(mockHttp.get).toHaveBeenCalledTimes(3); // initial + 2 retries

      jest.useRealTimers();
    });

    it('should emit empty data on final failure', async () => {
      jest.useFakeTimers();
      mockHttp.get.mockRejectedValue(new Error('Error'));
      const subscription = jest.fn();
      cpsManager.projects$.subscribe(subscription);

      const promise = cpsManager.fetchProjects();
      const timerPromise = jest.runAllTimersAsync();

      await expect(Promise.all([promise, timerPromise])).rejects.toThrow();

      expect(subscription).toHaveBeenLastCalledWith({
        origin: null,
        linkedProjects: [],
      });

      jest.useRealTimers();
    });
  });
});
