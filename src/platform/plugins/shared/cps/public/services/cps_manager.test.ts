/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { CPSManager } from './cps_manager';
import type { ApplicationStart, HttpSetup } from '@kbn/core/public';
import type { CPSProject, ProjectTagsResponse } from '@kbn/cps-utils';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { BehaviorSubject } from 'rxjs';

describe('CPSManager', () => {
  let mockHttp: jest.Mocked<HttpSetup>;
  const mockLogger = loggingSystemMock.createLogger();
  let mockApplication: ApplicationStart;
  let cpsManager: CPSManager;

  const mockOriginProject: CPSProject = {
    _id: 'origin-id',
    _alias: 'Origin Project',
    _type: 'observability',
    _csp: 'aws',
    _region: 'us-east-1',
    _organisation: 'org-1',
  };

  const mockLinkedProjects: CPSProject[] = [
    {
      _id: 'linked-1',
      _alias: 'B Project',
      _type: 'security',
      _csp: 'azure',
      _region: 'eastus',
      _organisation: 'org-2',
    },
    {
      _id: 'linked-2',
      _alias: 'A Project',
      _type: 'elasticsearch',
      _csp: 'gcp',
      _region: 'us-central1',
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
    mockHttp = {
      post: jest.fn().mockResolvedValue(mockResponse),
      get: jest.fn().mockResolvedValue({ projectRouting: undefined }),
      basePath: {
        get: jest.fn().mockReturnValue(''),
        serverBasePath: '',
      },
    } as unknown as jest.Mocked<HttpSetup>;

    mockApplication = {
      currentAppId$: new BehaviorSubject<string | undefined>('discover'),
      currentLocation$: new BehaviorSubject<string>('#/'),
    } as unknown as ApplicationStart;

    cpsManager = new CPSManager({
      http: mockHttp,
      logger: mockLogger,
      application: mockApplication,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchProjects', () => {
    it('should fetch and store projects successfully', async () => {
      const result = await cpsManager.fetchProjects();

      expect(mockHttp.post).toHaveBeenCalledWith('/internal/cps/projects_tags');
      expect(result).toEqual({
        origin: mockOriginProject,
        linkedProjects: [mockLinkedProjects[1], mockLinkedProjects[0]], // sorted by alias
      });
    });

    it('should sort linked projects by alias', async () => {
      const result = await cpsManager.fetchProjects();

      expect(result!.linkedProjects[0]._alias).toBe('A Project');
      expect(result!.linkedProjects[1]._alias).toBe('B Project');
    });
  });

  describe('caching behavior', () => {
    it('should cache results and not refetch on subsequent calls', async () => {
      // First fetch
      await cpsManager.fetchProjects();
      expect(mockHttp.post).toHaveBeenCalledTimes(1);

      // Second fetch should return cached data without calling HTTP
      await cpsManager.fetchProjects();
      expect(mockHttp.post).toHaveBeenCalledTimes(1);
    });

    it('should not cache failed requests', async () => {
      jest.useFakeTimers();
      mockHttp.post.mockRejectedValue(new Error('Network error'));

      // First fetch fails - run all timers to completion
      const promise = cpsManager.fetchProjects();
      const timerPromise = jest.runAllTimersAsync();

      await expect(Promise.all([promise, timerPromise])).rejects.toThrow('Network error');

      expect(mockHttp.post).toHaveBeenCalledTimes(3); // initial + 2 retries

      jest.useRealTimers();
    });
  });

  describe('refresh', () => {
    it('should refetch data when refresh is called', async () => {
      mockHttp.post.mockResolvedValue(mockResponse);

      // First fetch
      await cpsManager.fetchProjects();
      expect(mockHttp.post).toHaveBeenCalledTimes(1);

      // Refresh should call HTTP again
      await cpsManager.refresh();
      expect(mockHttp.post).toHaveBeenCalledTimes(2);
    });

    it('should update cached data after refresh', async () => {
      const updatedProject: CPSProject = {
        ...mockOriginProject,
        _alias: 'Updated Project',
      };
      const updatedResponse: ProjectTagsResponse = {
        origin: { 'origin-id': updatedProject },
        linked_projects: mockResponse.linked_projects,
      };

      mockHttp.post.mockResolvedValueOnce(mockResponse);
      mockHttp.post.mockResolvedValueOnce(updatedResponse);

      // First fetch
      const result1 = await cpsManager.fetchProjects();
      expect(result1!.origin?._alias).toBe('Origin Project');

      // Refresh with new data
      const result2 = await cpsManager.refresh();
      expect(result2!.origin?._alias).toBe('Updated Project');

      // Subsequent fetch should return updated cached data
      const result3 = await cpsManager.fetchProjects();
      expect(result3!.origin?._alias).toBe('Updated Project');
      expect(mockHttp.post).toHaveBeenCalledTimes(2); // Only 2 calls, third was from cache
    });
  });

  describe('retry logic', () => {
    it('should retry on failure with exponential backoff', async () => {
      jest.useFakeTimers();
      mockHttp.post
        .mockRejectedValueOnce(new Error('Error 1'))
        .mockRejectedValueOnce(new Error('Error 2'))
        .mockResolvedValueOnce(mockResponse);

      const promise = cpsManager.fetchProjects();
      await jest.runAllTimersAsync();

      const result = await promise;

      expect(mockHttp.post).toHaveBeenCalledTimes(3); // initial + 2 retries
      expect(result!.origin).toEqual(mockOriginProject);

      jest.useRealTimers();
    });

    it('should throw error after max retries exceeded', async () => {
      jest.useFakeTimers();
      mockHttp.post.mockRejectedValue(new Error('Persistent error'));

      const promise = cpsManager.fetchProjects();
      const timerPromise = jest.runAllTimersAsync();

      await expect(Promise.all([promise, timerPromise])).rejects.toThrow('Persistent error');

      expect(mockHttp.post).toHaveBeenCalledTimes(3); // initial + 2 retries

      jest.useRealTimers();
    });

    it('should throw error on final failure', async () => {
      jest.useFakeTimers();
      mockHttp.post.mockRejectedValue(new Error('Error'));

      const promise = cpsManager.fetchProjects();
      const timerPromise = jest.runAllTimersAsync();

      await expect(Promise.all([promise, timerPromise])).rejects.toThrow();

      jest.useRealTimers();
    });
  });

  describe('default project routing', () => {
    const waitForInitialization = () => new Promise((resolve) => setTimeout(resolve, 0));

    const createManagerWithProjectRouting = async (
      projectRouting?: string,
      shouldError = false
    ) => {
      if (shouldError) {
        mockHttp.get = jest.fn().mockRejectedValue(new Error('Network error'));
      } else {
        mockHttp.get = jest.fn().mockResolvedValue({ projectRouting });
      }

      const manager = new CPSManager({
        http: mockHttp,
        logger: mockLogger,
        application: mockApplication,
      });

      await waitForInitialization();
      return manager;
    };

    describe('initializeDefaultProjectRouting', () => {
      it('should initialize with undefined when space has no projectRouting', async () => {
        const manager = await createManagerWithProjectRouting(undefined);

        expect(mockHttp.get).toHaveBeenCalledWith('/api/spaces/space/default');
        expect(manager.getDefaultProjectRouting()).toBe(undefined);
      });

      it('should initialize with space projectRouting when it exists', async () => {
        const spaceProjectRouting = '_alias:_origin';
        const manager = await createManagerWithProjectRouting(spaceProjectRouting);

        expect(mockHttp.get).toHaveBeenCalledWith('/api/spaces/space/default');
        expect(manager.getDefaultProjectRouting()).toBe(spaceProjectRouting);
      });

      it('should initialize with space projectRouting with current space', async () => {
        const spaceProjectRouting = '_alias:_origin';

        // Mock basePath to return a space-specific path
        const customMockHttp = {
          ...mockHttp,
          get: jest.fn().mockResolvedValue({ projectRouting: spaceProjectRouting }),
          basePath: {
            get: jest.fn().mockReturnValue('/s/test-space'),
            serverBasePath: '',
          },
        } as unknown as jest.Mocked<HttpSetup>;

        const manager = new CPSManager({
          http: customMockHttp,
          logger: mockLogger,
          application: mockApplication,
        });

        await waitForInitialization();

        expect(customMockHttp.get).toHaveBeenCalledWith('/api/spaces/space/test-space');
        expect(manager.getDefaultProjectRouting()).toBe(spaceProjectRouting);
      });

      it('should update current project routing if still set to default', async () => {
        const spaceProjectRouting = '_alias:_origin';
        const manager = await createManagerWithProjectRouting(spaceProjectRouting);

        expect(manager.getProjectRouting()).toBe(spaceProjectRouting);
      });

      it('should handle fetch errors gracefully', async () => {
        const manager = await createManagerWithProjectRouting(undefined, true);

        expect(mockHttp.get).toHaveBeenCalledWith('/api/spaces/space/default');
        expect(manager.getDefaultProjectRouting()).toBe(undefined);
        expect(mockLogger.warn).toHaveBeenCalledWith(
          'Failed to fetch default project routing for space',
          expect.any(Error)
        );
      });
    });

    describe('updateDefaultProjectRouting', () => {
      it('should update both default and current project routing', () => {
        const newRouting = '_alias:_origin';

        cpsManager.updateDefaultProjectRouting(newRouting);

        expect(cpsManager.getDefaultProjectRouting()).toBe(newRouting);
        expect(cpsManager.getProjectRouting()).toBe(newRouting);
      });

      it('should not update if new routing is the same as current default', () => {
        const routing = '_alias:_origin';

        cpsManager.updateDefaultProjectRouting(routing);
        const currentRoutingBefore = cpsManager.getProjectRouting();
        const defaultRoutingBefore = cpsManager.getDefaultProjectRouting();

        // Call again with same routing
        cpsManager.updateDefaultProjectRouting(routing);

        // Values should remain unchanged
        expect(cpsManager.getProjectRouting()).toBe(currentRoutingBefore);
        expect(cpsManager.getDefaultProjectRouting()).toBe(defaultRoutingBefore);
        expect(cpsManager.getProjectRouting()).toBe(routing);
      });

      it('should handle undefined projectRouting', () => {
        cpsManager.updateDefaultProjectRouting(undefined);

        expect(cpsManager.getDefaultProjectRouting()).toBe(undefined);
      });

      it('should update current routing even when user has manually set a value', () => {
        const userCustomRouting = '_alias:_origin';
        const newSpaceDefault = '_alias:*';

        cpsManager.setProjectRouting(userCustomRouting);

        cpsManager.updateDefaultProjectRouting(newSpaceDefault);

        // Both should be updated to the new default
        expect(cpsManager.getProjectRouting()).toBe(newSpaceDefault);
        expect(cpsManager.getDefaultProjectRouting()).toBe(newSpaceDefault);
      });

      it('should update current routing when it matches the old default', async () => {
        const initialRouting = '_alias:_origin';
        const manager = await createManagerWithProjectRouting(initialRouting);

        expect(manager.getDefaultProjectRouting()).toBe(initialRouting);
        expect(manager.getProjectRouting()).toBe(initialRouting);

        // Update default to a new value
        const newDefault = '_alias:*';
        manager.updateDefaultProjectRouting(newDefault);

        // Both current and default should be updated
        expect(manager.getProjectRouting()).toBe(newDefault);
        expect(manager.getDefaultProjectRouting()).toBe(newDefault);
      });

      it('should sync multiple updates correctly', () => {
        const routings = ['_alias:_origin', '_alias:*', '_alias:project1,project2'];

        routings.forEach((routing) => {
          cpsManager.updateDefaultProjectRouting(routing);
          expect(cpsManager.getDefaultProjectRouting()).toBe(routing);
        });
      });
    });

    describe('getDefaultProjectRouting', () => {
      it('should return the current default project routing', () => {
        expect(cpsManager.getDefaultProjectRouting()).toBe(undefined);
      });

      it('should return updated default after updateDefaultProjectRouting', () => {
        const newRouting = '_alias:_origin';
        cpsManager.updateDefaultProjectRouting(newRouting);

        expect(cpsManager.getDefaultProjectRouting()).toBe(newRouting);
      });
    });
  });
});
