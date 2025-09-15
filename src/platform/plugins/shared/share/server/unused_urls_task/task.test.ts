/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import moment from 'moment';
import { TaskInstanceWithId } from '@kbn/task-manager-plugin/server/task';
import {
  SavedObjectsBulkDeleteObject,
  SavedObjectsBulkDeleteResponse,
  SavedObjectsFindResult,
  SavedObjectsServiceStart,
} from '@kbn/core/server';
import { coreMock, loggingSystemMock, savedObjectsRepositoryMock } from '@kbn/core/server/mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { SAVED_OBJECT_TYPE, TASK_ID } from './constants';
import {
  durationToSeconds,
  getDeleteUnusedUrlTaskInstance,
  deleteUnusedUrls,
  fetchUnusedUrlsFromFirstNamespace,
  runDeleteUnusedUrlsTask,
  scheduleUnusedUrlsCleanupTask,
} from './task';

describe('unused_urls_task', () => {
  const mockSavedObjectsRepository = savedObjectsRepositoryMock.create();
  const mockLogger = loggingSystemMock.create().get();
  const mockCoreSetup = coreMock.createSetup();
  const mockCoreStart = coreMock.createStart();
  const mockTaskManager = taskManagerMock.createStart();
  const checkInterval = moment.duration(1, 'hour');
  const urlExpirationDuration = moment.duration(30, 'days');
  mockCoreSetup.getStartServices.mockResolvedValue([
    {
      ...mockCoreStart,
      savedObjects: {
        createInternalRepository: jest.fn(() => mockSavedObjectsRepository),
      } as unknown as SavedObjectsServiceStart,
    },
    {},
    {},
  ]);

  describe('durationToSeconds', () => {
    it('should convert moment duration to seconds string', () => {
      const duration = moment.duration(5, 'minutes');
      expect(durationToSeconds(duration)).toBe('300s');
    });
  });

  describe('getDeleteUnusedUrlTaskInstance', () => {
    it('should return a valid TaskInstanceWithId', () => {
      const interval = moment.duration(1, 'hour');
      const taskInstance = getDeleteUnusedUrlTaskInstance(interval);

      expect(taskInstance).toEqual({
        id: TASK_ID,
        taskType: TASK_ID,
        params: {},
        state: {},
        schedule: {
          interval: '3600s',
        },
        scope: ['share'],
      });
    });
  });

  describe('deleteUnusedUrls', () => {
    it('should call bulkDelete', async () => {
      const unusedUrls: SavedObjectsBulkDeleteObject[] = [{ type: 'url', id: '1' }];
      const namespace = 'test-namespace';

      mockSavedObjectsRepository.bulkDelete.mockResolvedValue({} as SavedObjectsBulkDeleteResponse);

      await deleteUnusedUrls({
        savedObjectsRepository: mockSavedObjectsRepository,
        unusedUrls,
        namespace,
        logger: mockLogger,
      });

      expect(mockSavedObjectsRepository.bulkDelete).toHaveBeenCalledWith(unusedUrls, {
        refresh: 'wait_for',
        namespace,
      });
    });

    it('should throw an error if bulkDelete fails', async () => {
      const unusedUrls = [{ type: 'url', id: '1' }];
      const namespace = 'test-namespace';
      const errorMessage = 'Bulk delete failed';

      mockSavedObjectsRepository.bulkDelete.mockRejectedValue(new Error(errorMessage));

      await expect(
        deleteUnusedUrls({
          savedObjectsRepository: mockSavedObjectsRepository,
          unusedUrls,
          namespace,
          logger: mockLogger,
        })
      ).rejects.toThrow(
        `Failed to delete unused URL(s) in namespace "${namespace}": ${errorMessage}`
      );
    });
  });

  describe('fetchUnusedUrls', () => {
    it('should fetch unused URLs and determine hasMore correctly', async () => {
      const urlLimit = 2;
      const savedObjects = [
        {
          id: '1',
          type: SAVED_OBJECT_TYPE,
          namespaces: ['test-namespace'],
        },
        {
          id: '2',
          type: SAVED_OBJECT_TYPE,
          namespaces: ['test-namespace'],
        },
      ] as SavedObjectsFindResult[];

      mockSavedObjectsRepository.find.mockResolvedValue({
        saved_objects: savedObjects,
        total: 3,
        per_page: urlLimit,
        page: 1,
      });

      const result = await fetchUnusedUrlsFromFirstNamespace({
        savedObjectsRepository: mockSavedObjectsRepository,
        urlExpirationDuration,
        urlLimit,
      });

      expect(mockSavedObjectsRepository.find).toHaveBeenCalledWith({
        type: SAVED_OBJECT_TYPE,
        filter: 'url.attributes.accessDate <= now-2592000s',
        perPage: urlLimit,
        namespaces: ['*'],
        fields: ['type'],
      });

      const savedObjectsDeleteObjects = [
        {
          id: '1',
          type: SAVED_OBJECT_TYPE,
        },
        {
          id: '2',
          type: SAVED_OBJECT_TYPE,
        },
      ];

      expect(result.unusedUrls).toEqual(savedObjectsDeleteObjects);
      expect(result.hasMore).toBe(true);
      expect(result.namespace).toBe('test-namespace');
    });

    it('should set hasMore to false if fewer items than urlLimit are returned', async () => {
      const urlLimit = 2;
      const savedObjects = [
        {
          id: '1',
          type: SAVED_OBJECT_TYPE,
          namespaces: ['test-namespace'],
        },
      ] as SavedObjectsFindResult[];

      mockSavedObjectsRepository.find.mockResolvedValue({
        saved_objects: savedObjects,
        total: 1,
        per_page: urlLimit,
        page: 1,
      });

      const result = await fetchUnusedUrlsFromFirstNamespace({
        savedObjectsRepository: mockSavedObjectsRepository,
        urlExpirationDuration,
        urlLimit,
      });

      const savedObjectsDeleteObjects = [
        {
          id: '1',
          type: SAVED_OBJECT_TYPE,
        },
      ];

      expect(result.unusedUrls).toEqual(savedObjectsDeleteObjects);
      expect(result.hasMore).toBe(false);
      expect(result.namespace).toBe('test-namespace');
    });

    it('should return default namespace if first object has no namespaces', async () => {
      const urlLimit = 10;
      const savedObjects = [
        {
          id: `id-1`,
          type: SAVED_OBJECT_TYPE,
        },
      ] as SavedObjectsFindResult[];

      mockSavedObjectsRepository.find.mockResolvedValue({
        saved_objects: savedObjects,
        total: 1,
        per_page: urlLimit,
        page: 1,
      });

      const result = await fetchUnusedUrlsFromFirstNamespace({
        savedObjectsRepository: mockSavedObjectsRepository,
        urlExpirationDuration,
        urlLimit,
      });

      expect(result.namespace).toBe('default');
    });
  });

  describe('runDeleteUnusedUrlsTask', () => {
    beforeEach(() => {
      mockSavedObjectsRepository.find.mockReset();
      mockSavedObjectsRepository.bulkDelete.mockReset();
    });

    it('should not call delete if there are no saved objects', async () => {
      const urlLimit = 2;
      mockSavedObjectsRepository.find.mockResolvedValue({
        saved_objects: [],
        total: 0,
        per_page: urlLimit,
        page: 1,
      });

      await runDeleteUnusedUrlsTask({
        core: mockCoreSetup,
        urlExpirationDuration,
        urlLimit,
        logger: mockLogger,
        isEnabled: true,
      });

      expect(mockSavedObjectsRepository.find).toHaveBeenCalledTimes(1);
      expect(mockSavedObjectsRepository.bulkDelete).not.toHaveBeenCalled();
    });

    it('should delete unused URLs if found', async () => {
      const savedObjects = [
        {
          id: '1',
          type: SAVED_OBJECT_TYPE,
          namespaces: ['my-space'],
        },
      ] as SavedObjectsFindResult[];

      mockSavedObjectsRepository.find.mockResolvedValue({
        saved_objects: savedObjects,
        total: 1,
        per_page: 100,
        page: 1,
      });

      mockSavedObjectsRepository.bulkDelete.mockResolvedValue({} as SavedObjectsBulkDeleteResponse);

      const response = await runDeleteUnusedUrlsTask({
        core: mockCoreSetup,
        urlExpirationDuration,
        urlLimit: 100,
        logger: mockLogger,
        isEnabled: true,
      });

      expect(response).toEqual({
        deletedCount: 1,
      });

      const savedObjectsDeleteObjects = [
        {
          id: '1',
          type: SAVED_OBJECT_TYPE,
        },
      ];

      expect(mockSavedObjectsRepository.bulkDelete).toHaveBeenCalledWith(
        savedObjectsDeleteObjects,
        {
          refresh: 'wait_for',
          namespace: 'my-space',
        }
      );
    });

    it('should handle pagination and delete across multiple pages', async () => {
      const page1 = [
        {
          id: '1',
          type: SAVED_OBJECT_TYPE,
          namespaces: ['default'],
        },
      ] as SavedObjectsFindResult[];

      const page2 = [
        {
          id: '2',
          type: SAVED_OBJECT_TYPE,
          namespaces: ['default'],
        },
      ] as SavedObjectsFindResult[];

      const page3 = [
        {
          id: '3',
          type: SAVED_OBJECT_TYPE,
          namespaces: ['other-namespace'],
        },
      ] as SavedObjectsFindResult[];

      mockSavedObjectsRepository.find
        .mockResolvedValueOnce({
          saved_objects: page1,
          total: 3,
          per_page: 1,
          page: 1,
        })
        .mockResolvedValueOnce({
          saved_objects: page2,
          total: 3,
          per_page: 1,
          page: 2,
        })
        .mockResolvedValueOnce({
          saved_objects: page3,
          total: 3,
          per_page: 1,
          page: 3,
        });

      mockSavedObjectsRepository.bulkDelete.mockResolvedValue({} as SavedObjectsBulkDeleteResponse);

      const response = await runDeleteUnusedUrlsTask({
        core: mockCoreSetup,
        urlExpirationDuration,
        urlLimit: 2,
        logger: mockLogger,
        isEnabled: true,
      });

      expect(response).toEqual({
        deletedCount: 2,
      });

      expect(mockSavedObjectsRepository.bulkDelete).toHaveBeenCalledTimes(2);

      const savedObjectsDeleteObjectsPage1 = [
        {
          id: '1',
          type: SAVED_OBJECT_TYPE,
        },
      ];

      const savedObjectsDeleteObjectsPage2 = [
        {
          id: '2',
          type: SAVED_OBJECT_TYPE,
        },
      ];

      expect(mockSavedObjectsRepository.bulkDelete).toHaveBeenNthCalledWith(
        1,
        savedObjectsDeleteObjectsPage1,
        {
          refresh: 'wait_for',
          namespace: 'default',
        }
      );
      expect(mockSavedObjectsRepository.bulkDelete).toHaveBeenNthCalledWith(
        2,
        savedObjectsDeleteObjectsPage2,
        {
          refresh: 'wait_for',
          namespace: 'default',
        }
      );
    });

    it('should throw if deleteUnusedUrls fails', async () => {
      const savedObjects = [
        {
          id: '1',
          type: SAVED_OBJECT_TYPE,
          namespaces: ['default'],
        },
      ] as SavedObjectsFindResult[];

      mockSavedObjectsRepository.find.mockResolvedValue({
        saved_objects: savedObjects,
        total: 1,
        per_page: 100,
        page: 1,
      });

      mockSavedObjectsRepository.bulkDelete.mockRejectedValue(new Error('bulkDelete failed'));

      await expect(
        runDeleteUnusedUrlsTask({
          core: mockCoreSetup,
          urlExpirationDuration,
          urlLimit: 100,
          logger: mockLogger,
          isEnabled: true,
        })
      ).rejects.toThrow('Failed to delete unused URL(s) in namespace "default": bulkDelete failed');
    });

    it('should skip execution if isEnabled is false', async () => {
      mockSavedObjectsRepository.find.mockResolvedValue({
        saved_objects: [],
        total: 0,
        per_page: 100,
        page: 1,
      });

      const response = await runDeleteUnusedUrlsTask({
        core: mockCoreSetup,
        urlExpirationDuration,
        urlLimit: 100,
        logger: mockLogger,
        isEnabled: false,
      });

      expect(response).toEqual({ deletedCount: 0 });
      expect(mockSavedObjectsRepository.find).not.toHaveBeenCalled();
      expect(mockSavedObjectsRepository.bulkDelete).not.toHaveBeenCalled();
    });
  });

  describe('scheduleUnusedUrlsCleanupTask', () => {
    it('should schedule the task successfully', async () => {
      mockTaskManager.ensureScheduled.mockResolvedValue({} as TaskInstanceWithId);
      const expectedTaskInstance = getDeleteUnusedUrlTaskInstance(checkInterval);

      await scheduleUnusedUrlsCleanupTask({
        taskManager: mockTaskManager,
        checkInterval,
        isEnabled: true,
      });

      expect(mockTaskManager.ensureScheduled).toHaveBeenCalledWith(expectedTaskInstance);
    });

    it('should throw an error if scheduling fails with a message', async () => {
      const errorMessage = 'Scheduling failed';
      mockTaskManager.ensureScheduled.mockRejectedValue(new Error(errorMessage));

      await expect(
        scheduleUnusedUrlsCleanupTask({
          taskManager: mockTaskManager,
          checkInterval,
          isEnabled: true,
        })
      ).rejects.toThrow(errorMessage);
    });

    it('should throw a generic error if scheduling fails without a message', async () => {
      mockTaskManager.ensureScheduled.mockRejectedValue(new Error());

      await expect(
        scheduleUnusedUrlsCleanupTask({
          taskManager: mockTaskManager,
          checkInterval,
          isEnabled: true,
        })
      ).rejects.toThrow('Failed to schedule unused URLs cleanup task');
    });

    it('should remove the task if isEnabled is false and not run it', async () => {
      mockTaskManager.ensureScheduled.mockClear();

      await scheduleUnusedUrlsCleanupTask({
        taskManager: mockTaskManager,
        checkInterval,
        isEnabled: false,
      });

      expect(mockTaskManager.ensureScheduled).not.toHaveBeenCalled();
      expect(mockTaskManager.removeIfExists).toHaveBeenCalledWith(TASK_ID);
    });
  });
});
