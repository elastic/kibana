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
import { ProjectRoutingAccess } from '@kbn/cps-utils';
import type { CPSProject, ProjectTagsResponse } from '@kbn/cps-utils';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { BehaviorSubject } from 'rxjs';

const DEFAULT_NPRE_VALUE = '_alias:*';

jest.mock('./async_services', () => ({
  ...jest.requireActual('./async_services'),
}));

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
      get: jest.fn().mockResolvedValue(undefined),
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
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('fetchProjects', () => {
    it('should fetch and store projects successfully', async () => {
      // fetches all projects to get the total project count
      expect(mockHttp.post).toHaveBeenCalledWith('/internal/cps/projects_tags', {
        body: JSON.stringify({ project_routing: '_alias:*' }),
      });
      jest.clearAllMocks();
      const result = await cpsManager.fetchProjects();
      expect(mockHttp.post).not.toHaveBeenCalled();
      expect(result).toEqual({
        origin: mockOriginProject,
        linkedProjects: [mockLinkedProjects[1], mockLinkedProjects[0]],
      });
    });

    it('should sort linked projects by alias', async () => {
      const result = await cpsManager.fetchProjects();

      expect(result!.linkedProjects[0]._alias).toBe('A Project');
      expect(result!.linkedProjects[1]._alias).toBe('B Project');
    });
  });

  describe('retry logic', () => {
    it('should retry on failure with exponential backoff', async () => {
      await cpsManager.whenReady();
      jest.clearAllMocks();
      jest.useFakeTimers();
      jest.clearAllMocks();
      mockHttp.post
        .mockRejectedValueOnce(new Error('Error 1'))
        .mockRejectedValueOnce(new Error('Error 2'))
        .mockResolvedValueOnce(mockResponse);

      const promise = cpsManager.fetchProjects('_alias:_origin');
      await jest.runAllTimersAsync();

      const result = await promise;

      expect(mockHttp.post).toHaveBeenCalledTimes(3); // initial + 2 retries
      expect(result!.origin).toEqual(mockOriginProject);
    });

    it('should throw error after max retries exceeded', async () => {
      await cpsManager.whenReady();
      jest.clearAllMocks();
      jest.useFakeTimers();
      mockHttp.post.mockRejectedValue(new Error('Persistent error'));

      const promise = cpsManager.fetchProjects('_alias:_origin');
      const timerPromise = jest.runAllTimersAsync();

      await expect(Promise.all([promise, timerPromise])).rejects.toThrow('Persistent error');

      expect(mockHttp.post).toHaveBeenCalledTimes(3); // initial + 2 retries
    });

    it('should throw error on final failure', async () => {
      await cpsManager.whenReady();
      jest.clearAllMocks();
      jest.useFakeTimers();
      mockHttp.post.mockRejectedValue(new Error('Error'));

      const promise = cpsManager.fetchProjects('_alias:_origin');
      const timerPromise = jest.runAllTimersAsync();

      await expect(Promise.all([promise, timerPromise])).rejects.toThrow();
    });
  });

  describe('default project routing', () => {
    const createManagerWithProjectRouting = async (
      projectRoutingValue?: string,
      shouldError = false
    ) => {
      if (shouldError) {
        mockHttp.get = jest.fn().mockRejectedValue(new Error('Network error'));
      } else {
        mockHttp.get = jest.fn().mockResolvedValue(projectRoutingValue);
      }

      const manager = new CPSManager({
        http: mockHttp,
        logger: mockLogger,
        application: mockApplication,
        appAccessResolvers: new Map([['discover', () => ProjectRoutingAccess.EDITABLE]]),
      });

      await manager.whenReady();
      return manager;
    };

    describe('initializeDefaultProjectRouting', () => {
      it('should initialize defaultProjectRouting to the fetched NPRE value (undefined when not set)', async () => {
        const manager = await createManagerWithProjectRouting(undefined);

        expect(mockHttp.get).toHaveBeenCalledWith(
          '/internal/cps/project_routing/kibana_space_default_default'
        );
        expect(manager.getDefaultProjectRouting()).toBeUndefined();
      });

      it('should initialize defaultProjectRouting to the fetched NPRE value', async () => {
        const spaceProjectRoutingValue = '_alias:_origin';
        const manager = await createManagerWithProjectRouting(spaceProjectRoutingValue);

        expect(mockHttp.get).toHaveBeenCalledWith(
          '/internal/cps/project_routing/kibana_space_default_default'
        );
        expect(manager.getDefaultProjectRouting()).toBe(spaceProjectRoutingValue);
      });

      it('should initialize with the current space name', async () => {
        const spaceProjectRoutingValue = '_alias:_origin';

        // Mock basePath to return a space-specific path
        const customMockHttp = {
          ...mockHttp,
          get: jest.fn().mockResolvedValue(spaceProjectRoutingValue),
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

        await manager.whenReady();

        expect(customMockHttp.get).toHaveBeenCalledWith(
          '/internal/cps/project_routing/kibana_space_test-space_default'
        );
        expect(manager.getDefaultProjectRouting()).toBe(spaceProjectRoutingValue);
      });

      it('should update current project routing to the resolved NPRE value after initialization', async () => {
        const manager = await createManagerWithProjectRouting('_alias:_origin');

        expect(manager.getProjectRouting()).toBe('_alias:_origin');
      });

      it('should handle fetch errors gracefully', async () => {
        const manager = await createManagerWithProjectRouting(undefined, true);

        expect(mockHttp.get).toHaveBeenCalledWith(
          '/internal/cps/project_routing/kibana_space_default_default'
        );
        expect(manager.getDefaultProjectRouting()).toBe('_alias:*');
        expect(mockLogger.warn).toHaveBeenCalledWith(
          'Failed to fetch default project routing for space',
          expect.any(Error)
        );
      });
    });
  });

  describe('getProjectRouting with different access levels', () => {
    const flushAsync = () => new Promise((resolve) => setTimeout(resolve, 0));

    beforeEach(() => {
      mockHttp.get = jest.fn().mockResolvedValue(DEFAULT_NPRE_VALUE);
      cpsManager = new CPSManager({
        http: mockHttp,
        logger: mockLogger,
        application: mockApplication,
        appAccessResolvers: new Map([['discover', () => ProjectRoutingAccess.EDITABLE]]),
      });
    });

    const changeAccess = async (access: ProjectRoutingAccess) => {
      cpsManager.registerAppAccess('app', () => access);
      (mockApplication.currentAppId$ as BehaviorSubject<string | undefined>).next('app');
      await flushAsync();
    };

    it('returns undefined when access is DISABLED', async () => {
      await cpsManager.whenReady();
      await changeAccess(ProjectRoutingAccess.DISABLED);

      expect(cpsManager.getProjectRouting()).toBeUndefined();
    });

    it('returns default project routing when access is READONLY', async () => {
      await cpsManager.whenReady();
      await changeAccess(ProjectRoutingAccess.READONLY);

      expect(cpsManager.getProjectRouting()).toBe(DEFAULT_NPRE_VALUE);
    });

    it('returns current value when access is EDITABLE', async () => {
      await cpsManager.whenReady();
      await changeAccess(ProjectRoutingAccess.EDITABLE);

      expect(cpsManager.getProjectRouting()).toBe(DEFAULT_NPRE_VALUE);
    });

    it('returns the override value when provided', () => {
      expect(cpsManager.getProjectRouting('_alias:*')).toBe('_alias:*');
      expect(cpsManager.getProjectRouting('_alias:_origin')).toBe('_alias:_origin');
    });

    it('falls back to current projectRouting$ value when no override is provided', () => {
      cpsManager.setProjectRouting('_alias:_origin');
      expect(cpsManager.getProjectRouting()).toBe('_alias:_origin');
    });

    it('resets to undefined when access changes from EDITABLE to DISABLED', async () => {
      await cpsManager.whenReady();
      await changeAccess(ProjectRoutingAccess.EDITABLE);
      cpsManager.setProjectRouting('_alias:_origin');

      await changeAccess(ProjectRoutingAccess.DISABLED);
      expect(cpsManager.getProjectRouting()).toBeUndefined();
    });

    it('resets to default when access changes from EDITABLE to READONLY', async () => {
      await cpsManager.whenReady();
      await changeAccess(ProjectRoutingAccess.EDITABLE);
      cpsManager.setProjectRouting('_alias:_origin');

      await changeAccess(ProjectRoutingAccess.READONLY);
      expect(cpsManager.getProjectRouting()).toBe(DEFAULT_NPRE_VALUE);
    });

    it('restores last editable routing when access returns to EDITABLE', async () => {
      await cpsManager.whenReady();
      await changeAccess(ProjectRoutingAccess.EDITABLE);
      cpsManager.setProjectRouting('_alias:_origin');

      await changeAccess(ProjectRoutingAccess.DISABLED);
      expect(cpsManager.getProjectRouting()).toBeUndefined();

      await changeAccess(ProjectRoutingAccess.EDITABLE);
      expect(cpsManager.getProjectRouting()).toBe('_alias:_origin');
    });

    it('returns DEFAULT_PROJECT_ROUTING when no override and no explicit set', () => {
      expect(cpsManager.getProjectRouting()).toBe(DEFAULT_NPRE_VALUE);
    });

    it('returns undefined when access is DISABLED, regardless of override', async () => {
      await changeAccess(ProjectRoutingAccess.DISABLED);

      expect(cpsManager.getProjectRouting()).toBeUndefined();
      expect(cpsManager.getProjectRouting('_alias:_origin')).toBeUndefined();
    });

    it('resets projectRouting$ to default when access changes to DISABLED', async () => {
      cpsManager.setProjectRouting('_alias:_origin');
      expect(cpsManager.getProjectRouting()).toBe('_alias:_origin');

      await changeAccess(ProjectRoutingAccess.DISABLED);
      expect(cpsManager.getProjectRouting()).toBeUndefined();

      await changeAccess(ProjectRoutingAccess.READONLY);
      expect(cpsManager.getProjectRouting()).toBe(DEFAULT_NPRE_VALUE);

      await changeAccess(ProjectRoutingAccess.EDITABLE);
      expect(cpsManager.getProjectRouting()).toBe('_alias:_origin');
    });
  });

  describe('updateDefaultProjectRouting', () => {
    const flushAsync = () => new Promise((resolve) => setTimeout(resolve, 0));

    const changeAccess = async (access: ProjectRoutingAccess) => {
      cpsManager.registerAppAccess('app', () => access);
      (mockApplication.currentAppId$ as BehaviorSubject<string | undefined>).next('app');
      await flushAsync();
    };

    beforeEach(() => {
      mockHttp.get = jest.fn().mockResolvedValue(DEFAULT_NPRE_VALUE);

      cpsManager = new CPSManager({
        http: mockHttp,
        logger: mockLogger,
        application: mockApplication,
        appAccessResolvers: new Map([['discover', () => ProjectRoutingAccess.EDITABLE]]),
      });
    });

    it('updates the default project routing and current routing when access is EDITABLE', async () => {
      await cpsManager.whenReady();

      cpsManager.setProjectRouting('_alias:_origin');
      expect(cpsManager.getProjectRouting()).toBe('_alias:_origin');

      cpsManager.updateDefaultProjectRouting('_alias:*');

      expect(cpsManager.getDefaultProjectRouting()).toBe('_alias:*');
      expect(cpsManager.getProjectRouting()).toBe('_alias:*');
    });

    it('does not update current routing when access is DISABLED (remains undefined)', async () => {
      await cpsManager.whenReady();
      await changeAccess(ProjectRoutingAccess.DISABLED);

      expect(cpsManager.getProjectRouting()).toBeUndefined();

      cpsManager.updateDefaultProjectRouting('_alias:_origin');

      expect(cpsManager.getDefaultProjectRouting()).toBe('_alias:_origin');
      expect(cpsManager.getProjectRouting()).toBeUndefined();
    });
  });
});
