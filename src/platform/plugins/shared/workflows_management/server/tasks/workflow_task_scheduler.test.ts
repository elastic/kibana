/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/core/server';
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
} as any;

describe('WorkflowTaskScheduler RRule Validation', () => {
  let scheduler: WorkflowTaskScheduler;

  beforeEach(() => {
    scheduler = new WorkflowTaskScheduler(mockLogger, mockTaskManager);
    jest.clearAllMocks();
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

      await expect(scheduler.scheduleWorkflowTasks(workflow, 'default')).resolves.toEqual([
        'test-task-id',
      ]);
      expect(mockTaskManager.schedule).toHaveBeenCalledTimes(1);

      // Verify the task instance structure includes workflowid
      expect(mockTaskManager.schedule).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'workflow:test-workflow:scheduled',
          taskType: 'workflow:scheduled',
          params: expect.objectContaining({
            workflowId: 'test-workflow',
            spaceId: 'default',
            triggerType: 'scheduled',
          }),
        })
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

      await expect(scheduler.scheduleWorkflowTasks(workflow, 'default')).rejects.toThrow(
        'Invalid RRule frequency: "INVALID"'
      );
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

      await expect(scheduler.scheduleWorkflowTasks(workflow, 'default')).rejects.toThrow(
        'WEEKLY frequency requires at least one byweekday value'
      );
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

      await expect(scheduler.scheduleWorkflowTasks(workflow, 'default')).rejects.toThrow(
        'MONTHLY frequency requires either bymonthday or byweekday values'
      );
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

      await expect(scheduler.scheduleWorkflowTasks(workflow, 'default')).rejects.toThrow(
        'Invalid RRule byhour: "25"'
      );
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

      await expect(scheduler.scheduleWorkflowTasks(workflow, 'default')).rejects.toThrow(
        'Invalid RRule byminute: "60"'
      );
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

      await expect(scheduler.scheduleWorkflowTasks(workflow, 'default')).rejects.toThrow(
        'Invalid RRule bymonthday: "32"'
      );
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

      await expect(scheduler.scheduleWorkflowTasks(workflow, 'default')).rejects.toThrow(
        'Invalid RRule byweekday: "INVALID"'
      );
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

      await expect(scheduler.scheduleWorkflowTasks(workflow, 'default')).rejects.toThrow(
        'Invalid RRule dtstart: "invalid-date"'
      );
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

      await expect(scheduler.scheduleWorkflowTasks(workflow, 'default')).resolves.toEqual([
        'test-task-id',
      ]);
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

      await scheduler.scheduleWorkflowTasks(workflow, 'default');

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('RRule schedule created')
      );
    });
  });
});
