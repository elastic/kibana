/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import type { EsWorkflow } from '@kbn/workflows';
import { WorkflowTaskScheduler } from './workflow_task_scheduler';

// Mock logger
const mockLogger: Logger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  fatal: jest.fn(),
  trace: jest.fn(),
  isLevelEnabled: jest.fn(),
  get: jest.fn(),
} as any;

// Mock TaskManager
const mockTaskManager: TaskManagerStartContract = {
  schedule: jest.fn().mockResolvedValue({ id: 'test-task-id' }),
  fetch: jest.fn().mockResolvedValue({ docs: [] }),
  bulkRemove: jest.fn().mockResolvedValue(undefined),
  bulkUpdateSchedules: jest.fn().mockResolvedValue({ tasks: [], errors: [] }),
} as any;

const mockRequest = {} as KibanaRequest;

describe('WorkflowTaskScheduler', () => {
  let scheduler: WorkflowTaskScheduler;

  beforeEach(() => {
    scheduler = new WorkflowTaskScheduler(mockLogger, mockTaskManager);
    jest.clearAllMocks();
  });

  describe('Idempotent scheduling', () => {
    it('should handle 409 conflict by updating schedule in place', async () => {
      const conflictError = new Error('Conflict') as Error & { statusCode: number };
      conflictError.statusCode = 409;
      (mockTaskManager.schedule as jest.Mock).mockRejectedValueOnce(conflictError);
      (mockTaskManager.bulkUpdateSchedules as jest.Mock).mockResolvedValueOnce({
        tasks: [{ id: 'workflow:test-workflow:scheduled' }],
        errors: [],
      });

      const workflow: EsWorkflow = {
        id: 'test-workflow',
        name: 'Test Workflow',
        enabled: true,
        tags: [],
        definition: {
          triggers: [{ type: 'scheduled', with: { every: '30s' } }],
          steps: [],
          name: 'Test Workflow',
          enabled: false,
          version: '1',
        },
        yaml: '',
        createdBy: 'test-user',
        lastUpdatedBy: 'test-user',
        valid: true,
        deleted_at: null,
        createdAt: new Date(),
        lastUpdatedAt: new Date(),
      };

      const result = await scheduler.scheduleWorkflowTasks(workflow, 'default', mockRequest);

      expect(result).toEqual(['workflow:test-workflow:scheduled']);
      expect(mockTaskManager.schedule).toHaveBeenCalledTimes(1);
      expect(mockTaskManager.bulkUpdateSchedules).toHaveBeenCalledTimes(1);
      expect(mockTaskManager.bulkUpdateSchedules).toHaveBeenCalledWith(
        ['workflow:test-workflow:scheduled'],
        expect.objectContaining({ interval: '30s' })
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Updated existing scheduled task')
      );
    });

    it('should propagate non-409 errors from schedule', async () => {
      const serverError = new Error('Server error') as Error & { statusCode: number };
      serverError.statusCode = 500;
      (mockTaskManager.schedule as jest.Mock).mockRejectedValueOnce(serverError);

      const workflow: EsWorkflow = {
        id: 'test-workflow',
        name: 'Test Workflow',
        enabled: true,
        tags: [],
        definition: {
          triggers: [{ type: 'scheduled', with: { every: '30s' } }],
          steps: [],
          name: 'Test Workflow',
          enabled: false,
          version: '1',
        },
        yaml: '',
        createdBy: 'test-user',
        lastUpdatedBy: 'test-user',
        valid: true,
        deleted_at: null,
        createdAt: new Date(),
        lastUpdatedAt: new Date(),
      };

      await expect(
        scheduler.scheduleWorkflowTasks(workflow, 'default', mockRequest)
      ).rejects.toThrow('Server error');
      expect(mockTaskManager.bulkUpdateSchedules).not.toHaveBeenCalled();
    });

    it('should not delete tasks on updateWorkflowTasks (idempotent update)', async () => {
      const workflow: EsWorkflow = {
        id: 'test-workflow',
        name: 'Test Workflow',
        enabled: true,
        tags: [],
        definition: {
          triggers: [{ type: 'scheduled', with: { every: '30s' } }],
          steps: [],
          name: 'Test Workflow',
          enabled: false,
          version: '1',
        },
        yaml: '',
        createdBy: 'test-user',
        lastUpdatedBy: 'test-user',
        valid: true,
        deleted_at: null,
        createdAt: new Date(),
        lastUpdatedAt: new Date(),
      };

      await scheduler.updateWorkflowTasks(workflow, 'default', mockRequest);

      // Should NOT call fetch/bulkRemove (no delete step)
      expect(mockTaskManager.fetch).not.toHaveBeenCalled();
      expect(mockTaskManager.bulkRemove).not.toHaveBeenCalled();
      // Should call schedule
      expect(mockTaskManager.schedule).toHaveBeenCalledTimes(1);
    });
  });

  describe('RRule Validation', () => {
    it('should validate valid RRule configuration', async () => {
      const workflow: EsWorkflow = {
        id: 'test-workflow',
        name: 'Test Workflow',
        enabled: true,
        tags: [],
        definition: {
          triggers: [
            {
              type: 'scheduled',
              with: {
                rrule: {
                  freq: 'DAILY',
                  interval: 1,
                  tzid: 'UTC',
                  byhour: [9],
                  byminute: [0],
                },
              },
            },
          ],
          steps: [],
          name: 'Test Workflow',
          enabled: false,
          version: '1',
        },
        yaml: '',
        createdBy: 'test-user',
        lastUpdatedBy: 'test-user',
        valid: true,
        deleted_at: null,
        createdAt: new Date(),
        lastUpdatedAt: new Date(),
      };

      await expect(
        scheduler.scheduleWorkflowTasks(workflow, 'default', mockRequest)
      ).resolves.toEqual(['test-task-id']);
      expect(mockTaskManager.schedule).toHaveBeenCalledTimes(1);

      // Verify the task instance structure includes workflowid and request
      expect(mockTaskManager.schedule).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'workflow:test-workflow:scheduled',
          taskType: 'workflow:scheduled',
          params: expect.objectContaining({
            workflowId: 'test-workflow',
            spaceId: 'default',
            triggerType: 'scheduled',
          }),
        }),
        { request: mockRequest }
      );
    });

    it('should reject invalid RRule frequency', async () => {
      const workflow: EsWorkflow = {
        id: 'test-workflow',
        name: 'Test Workflow',
        enabled: true,
        tags: [],
        definition: {
          name: 'Test Workflow',
          enabled: false,
          version: '1',
          triggers: [
            {
              type: 'scheduled',
              with: {
                rrule: {
                  freq: 'INVALID' as any,
                  interval: 1,
                  tzid: 'UTC',
                },
              },
            },
          ],
          steps: [],
        },
        yaml: '',
        createdBy: 'test-user',
        lastUpdatedBy: 'test-user',
        valid: true,
        deleted_at: null,
        createdAt: new Date(),
        lastUpdatedAt: new Date(),
      };

      await expect(
        scheduler.scheduleWorkflowTasks(workflow, 'default', mockRequest)
      ).rejects.toThrow('Invalid RRule frequency: "INVALID"');
    });

    it('should reject WEEKLY frequency without byweekday', async () => {
      const workflow: EsWorkflow = {
        id: 'test-workflow',
        name: 'Test Workflow',
        enabled: true,
        tags: [],
        definition: {
          name: 'Test Workflow',
          enabled: false,
          version: '1',
          triggers: [
            {
              type: 'scheduled',
              with: {
                rrule: {
                  freq: 'WEEKLY',
                  interval: 1,
                  tzid: 'UTC',
                },
              },
            },
          ],
          steps: [],
        },
        yaml: '',
        createdBy: 'test-user',
        lastUpdatedBy: 'test-user',
        valid: true,
        deleted_at: null,
        createdAt: new Date(),
        lastUpdatedAt: new Date(),
      };

      await expect(
        scheduler.scheduleWorkflowTasks(workflow, 'default', mockRequest)
      ).rejects.toThrow('WEEKLY frequency requires at least one byweekday value');
    });

    it('should reject MONTHLY frequency without bymonthday or byweekday', async () => {
      const workflow: EsWorkflow = {
        id: 'test-workflow',
        name: 'Test Workflow',
        enabled: true,
        tags: [],
        definition: {
          name: 'Test Workflow',
          enabled: false,
          version: '1',
          triggers: [
            {
              type: 'scheduled',
              with: {
                rrule: {
                  freq: 'MONTHLY',
                  interval: 1,
                  tzid: 'UTC',
                },
              },
            },
          ],
          steps: [],
        },
        yaml: '',
        createdBy: 'test-user',
        lastUpdatedBy: 'test-user',
        valid: true,
        deleted_at: null,
        createdAt: new Date(),
        lastUpdatedAt: new Date(),
      };

      await expect(
        scheduler.scheduleWorkflowTasks(workflow, 'default', mockRequest)
      ).rejects.toThrow('MONTHLY frequency requires either bymonthday or byweekday values');
    });

    it('should reject invalid byhour values', async () => {
      const workflow: EsWorkflow = {
        id: 'test-workflow',
        name: 'Test Workflow',
        enabled: true,
        tags: [],
        definition: {
          name: 'Test Workflow',
          enabled: false,
          version: '1',
          triggers: [
            {
              type: 'scheduled',
              with: {
                rrule: {
                  freq: 'DAILY',
                  interval: 1,
                  tzid: 'UTC',
                  byhour: [25], // Invalid hour
                },
              },
            },
          ],
          steps: [],
        },
        yaml: '',
        createdBy: 'test-user',
        lastUpdatedBy: 'test-user',
        valid: true,
        deleted_at: null,
        createdAt: new Date(),
        lastUpdatedAt: new Date(),
      };

      await expect(
        scheduler.scheduleWorkflowTasks(workflow, 'default', mockRequest)
      ).rejects.toThrow('Invalid RRule byhour: "25"');
    });

    it('should reject invalid byminute values', async () => {
      const workflow: EsWorkflow = {
        id: 'test-workflow',
        name: 'Test Workflow',
        enabled: true,
        tags: [],
        definition: {
          name: 'Test Workflow',
          enabled: false,
          version: '1',
          triggers: [
            {
              type: 'scheduled',
              with: {
                rrule: {
                  freq: 'DAILY',
                  interval: 1,
                  tzid: 'UTC',
                  byminute: [60], // Invalid minute
                },
              },
            },
          ],
          steps: [],
        },
        yaml: '',
        createdBy: 'test-user',
        lastUpdatedBy: 'test-user',
        valid: true,
        deleted_at: null,
        createdAt: new Date(),
        lastUpdatedAt: new Date(),
      };

      await expect(
        scheduler.scheduleWorkflowTasks(workflow, 'default', mockRequest)
      ).rejects.toThrow('Invalid RRule byminute: "60"');
    });

    it('should reject invalid bymonthday values', async () => {
      const workflow: EsWorkflow = {
        id: 'test-workflow',
        name: 'Test Workflow',
        enabled: true,
        tags: [],
        definition: {
          name: 'Test Workflow',
          enabled: false,
          version: '1',
          triggers: [
            {
              type: 'scheduled',
              with: {
                rrule: {
                  freq: 'MONTHLY',
                  interval: 1,
                  tzid: 'UTC',
                  bymonthday: [32], // Invalid month day
                },
              },
            },
          ],
          steps: [],
        },
        yaml: '',
        createdBy: 'test-user',
        lastUpdatedBy: 'test-user',
        valid: true,
        deleted_at: null,
        createdAt: new Date(),
        lastUpdatedAt: new Date(),
      };

      await expect(
        scheduler.scheduleWorkflowTasks(workflow, 'default', mockRequest)
      ).rejects.toThrow('Invalid RRule bymonthday: "32"');
    });

    it('should reject invalid byweekday values', async () => {
      const workflow: EsWorkflow = {
        id: 'test-workflow',
        name: 'Test Workflow',
        enabled: true,
        tags: [],
        definition: {
          name: 'Test Workflow',
          enabled: false,
          version: '1',
          triggers: [
            {
              type: 'scheduled',
              with: {
                rrule: {
                  freq: 'WEEKLY',
                  interval: 1,
                  tzid: 'UTC',
                  byweekday: ['INVALID' as any], // Invalid weekday
                },
              },
            },
          ],
          steps: [],
        },
        yaml: '',
        createdBy: 'test-user',
        lastUpdatedBy: 'test-user',
        valid: true,
        deleted_at: null,
        createdAt: new Date(),
        lastUpdatedAt: new Date(),
      };

      await expect(
        scheduler.scheduleWorkflowTasks(workflow, 'default', mockRequest)
      ).rejects.toThrow('Invalid RRule byweekday: "INVALID"');
    });

    it('should reject invalid dtstart values', async () => {
      const workflow: EsWorkflow = {
        id: 'test-workflow',
        name: 'Test Workflow',
        enabled: true,
        tags: [],
        definition: {
          name: 'Test Workflow',
          enabled: false,
          version: '1',
          triggers: [
            {
              type: 'scheduled',
              with: {
                rrule: {
                  freq: 'DAILY',
                  interval: 1,
                  tzid: 'UTC',
                  dtstart: 'invalid-date', // Invalid date
                },
              },
            },
          ],
          steps: [],
        },
        yaml: '',
        createdBy: 'test-user',
        lastUpdatedBy: 'test-user',
        valid: true,
        deleted_at: null,
        createdAt: new Date(),
        lastUpdatedAt: new Date(),
      };

      await expect(
        scheduler.scheduleWorkflowTasks(workflow, 'default', mockRequest)
      ).rejects.toThrow('Invalid RRule dtstart: "invalid-date"');
    });

    it('should accept valid complex RRule configuration', async () => {
      const workflow: EsWorkflow = {
        id: 'test-workflow',
        name: 'Test Workflow',
        enabled: true,
        tags: [],
        definition: {
          name: 'Test Workflow',
          enabled: false,
          version: '1',
          triggers: [
            {
              type: 'scheduled',
              with: {
                rrule: {
                  freq: 'WEEKLY',
                  interval: 2,
                  tzid: 'America/New_York',
                  byweekday: ['MO', 'WE', 'FR'],
                  byhour: [8, 17],
                  byminute: [0],
                  dtstart: '2024-01-15T08:00:00-05:00',
                },
              },
            },
          ],
          steps: [],
        },
        yaml: '',
        createdBy: 'test-user',
        lastUpdatedBy: 'test-user',
        valid: true,
        deleted_at: null,
        createdAt: new Date(),
        lastUpdatedAt: new Date(),
      };

      await expect(
        scheduler.scheduleWorkflowTasks(workflow, 'default', mockRequest)
      ).resolves.toEqual(['test-task-id']);
      expect(mockTaskManager.schedule).toHaveBeenCalledTimes(1);
    });
  });

  describe('Logging', () => {
    it('should log RRule scheduling details', async () => {
      const workflow: EsWorkflow = {
        id: 'test-workflow',
        name: 'Test Workflow',
        enabled: true,
        tags: [],
        definition: {
          name: 'Test Workflow',
          enabled: false,
          version: '1',
          triggers: [
            {
              type: 'scheduled',
              with: {
                rrule: {
                  freq: 'DAILY',
                  interval: 1,
                  tzid: 'UTC',
                  byhour: [9],
                  byminute: [0],
                },
              },
            },
          ],
          steps: [],
        },
        yaml: '',
        createdBy: 'test-user',
        lastUpdatedBy: 'test-user',
        valid: true,
        deleted_at: null,
        createdAt: new Date(),
        lastUpdatedAt: new Date(),
      };

      await scheduler.scheduleWorkflowTasks(workflow, 'default', mockRequest);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('RRule schedule created')
      );
    });
  });
});
