/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ByteSizeValue } from '@kbn/config-schema';
import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { licensingMock } from '@kbn/licensing-plugin/server/mocks';
import { ExecutionStatus } from '@kbn/workflows';
import { runWorkflowRecoveryScan } from './run_workflow_recovery_scan';
import { WORKFLOW_RECOVERY_METADATA_KEY } from './workflow_recovery_constants';
import { DEFAULT_WORKFLOW_RECOVERY_CONFIG, type WorkflowsExecutionEngineConfig } from '../config';
import { WorkflowExecutionRepository } from '../repositories/workflow_execution_repository';
import { WORKFLOW_RUN_TASK_TYPE } from '../workflow_task_manager/types';

jest.mock('../repositories/workflow_execution_repository');

describe('runWorkflowRecoveryScan', () => {
  const logger = loggingSystemMock.createLogger();
  const basePath = elasticsearchServiceMock.createStart().http.basePath;

  const makeConfig = (
    recoveryOverrides?: Partial<WorkflowsExecutionEngineConfig['recovery']>
  ): WorkflowsExecutionEngineConfig => ({
    enabled: true,
    eventDriven: { enabled: true, logEvents: true, maxChainDepth: 10 },
    maxWorkflowDepth: 10,
    logging: { console: false },
    http: { allowedHosts: ['*'] },
    maxResponseSize: new ByteSizeValue(1024),
    collectQueueMetrics: false,
    recovery: { ...DEFAULT_WORKFLOW_RECOVERY_CONFIG, ...recoveryOverrides },
  });

  const makeDeps = (options?: {
    recovery?: Partial<WorkflowsExecutionEngineConfig['recovery']>;
    searchHits?: Array<{ id: string; spaceId: string; _source: Record<string, unknown> }>;
    hasActive?: boolean;
    runTaskId?: string | null;
    taskApiKey?: string;
  }) => {
    const taskManager = {
      schedule: jest.fn().mockResolvedValue({ id: 'scheduled-resume-task' }),
      fetch: jest.fn().mockImplementation((opts: { query?: unknown }) => {
        const must = (opts.query as { bool?: { must?: unknown[] } })?.bool?.must;
        const isRunLookup =
          Array.isArray(must) &&
          must.some(
            (c) =>
              typeof c === 'object' &&
              c !== null &&
              (c as { term?: Record<string, string> }).term?.['task.taskType'] ===
                WORKFLOW_RUN_TASK_TYPE
          );
        if (isRunLookup) {
          return Promise.resolve({
            docs: options?.runTaskId ? [{ id: options.runTaskId }] : [],
            versionMap: new Map(),
          });
        }
        return Promise.resolve({
          docs: options?.hasActive ? [{ id: 'active-task' }] : [],
          versionMap: new Map(),
        });
      }),
      get: jest.fn().mockResolvedValue({
        id: options?.runTaskId ?? 'run-task-1',
        apiKey: options?.taskApiKey ?? 'dGVzdDpwYXNz',
        userScope: { spaceId: 'default', apiKeyId: 'key1', apiKeyCreatedByUser: false },
      }),
    };

    const searchRecoverableExecutions = jest.fn().mockResolvedValue(options?.searchHits ?? []);
    const updateWorkflowExecution = jest.fn().mockResolvedValue(undefined);

    (WorkflowExecutionRepository as jest.Mock).mockImplementation(() => ({
      searchRecoverableExecutions,
      updateWorkflowExecution,
    }));

    return {
      coreStart: elasticsearchServiceMock.createStart(),
      taskManager: taskManager as unknown as Parameters<
        typeof runWorkflowRecoveryScan
      >[0]['taskManager'],
      config: makeConfig(options?.recovery),
      logger,
      basePath,
      licensing: licensingMock.createLicense(),
      mocks: { searchRecoverableExecutions, updateWorkflowExecution },
      taskManagerMocks: taskManager,
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('no-ops when recovery is disabled', async () => {
    const deps = makeDeps();
    deps.config.recovery.enabled = false;
    await runWorkflowRecoveryScan(deps);
    expect(deps.mocks.searchRecoverableExecutions).not.toHaveBeenCalled();
  });

  it('marks FAILED when max auto-resume attempts exceeded', async () => {
    const deps = makeDeps({
      searchHits: [
        {
          id: 'exec-1',
          spaceId: 'default',
          _source: {
            id: 'exec-1',
            spaceId: 'default',
            metadata: {
              [WORKFLOW_RECOVERY_METADATA_KEY]: { autoResumeScheduledCount: 5 },
            },
          },
        },
      ],
    });

    await runWorkflowRecoveryScan(deps);

    expect(deps.mocks.updateWorkflowExecution).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'exec-1',
        status: ExecutionStatus.FAILED,
        error: expect.objectContaining({ type: 'WorkflowRecoveryError' }),
      })
    );
  });

  it('schedules workflow:resume and updates recovery metadata on success', async () => {
    const deps = makeDeps({
      recovery: { enabled: true },
      searchHits: [
        {
          id: 'exec-1',
          spaceId: 'default',
          _source: {
            id: 'exec-1',
            spaceId: 'default',
            metadata: {},
          },
        },
      ],
      runTaskId: 'run-task-1',
    });

    await runWorkflowRecoveryScan(deps);

    expect(deps.taskManagerMocks.schedule).toHaveBeenCalled();
    expect(deps.mocks.updateWorkflowExecution).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'exec-1',
        metadata: expect.objectContaining({
          [WORKFLOW_RECOVERY_METADATA_KEY]: expect.objectContaining({
            autoResumeScheduledCount: 1,
          }),
        }),
      })
    );
  });
});
