/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ByteSizeValue } from '@kbn/config-schema';
import type { KibanaRequest, Logger } from '@kbn/core/server';
import { ExecutionStatus } from '@kbn/workflows';

import type { setupDependencies } from './setup_dependencies';
import type { WorkflowsExecutionEngineConfig } from '../config';
import {
  DEFAULT_EXECUTION_INDEX_CLEANUP_MIN_INDEX_AGE,
  DEFAULT_EXECUTION_INDEX_CLEANUP_TASK_INTERVAL,
  DEFAULT_EXECUTION_INDEX_ROLLOVER_MAX_AGE,
  DEFAULT_EXECUTION_INDEX_ROLLOVER_MAX_PRIMARY_SHARD_SIZE,
  DEFAULT_EXECUTION_INDEX_ROLLOVER_TASK_INTERVAL,
} from '../config';
import type { ContextDependencies } from '../workflow_context_manager/types';

const defaultExecutionIndexConfig = {
  executionIndexRolloverTaskInterval: DEFAULT_EXECUTION_INDEX_ROLLOVER_TASK_INTERVAL,
  executionIndexRolloverMaxAge: DEFAULT_EXECUTION_INDEX_ROLLOVER_MAX_AGE,
  executionIndexRolloverMaxPrimaryShardSize: DEFAULT_EXECUTION_INDEX_ROLLOVER_MAX_PRIMARY_SHARD_SIZE,
  executionIndexCleanupTaskInterval: DEFAULT_EXECUTION_INDEX_CLEANUP_TASK_INTERVAL,
  executionIndexCleanupMinIndexAge: DEFAULT_EXECUTION_INDEX_CLEANUP_MIN_INDEX_AGE,
} as const;

export const createMockWorkflowExecutionEngineConfig = (): WorkflowsExecutionEngineConfig => ({
  enabled: true,
  eventDriven: { enabled: true, logEvents: true, maxChainDepth: 10 },
  maxWorkflowDepth: 10,
  logging: { console: true },
  http: { allowedHosts: ['*'] },
  maxResponseSize: new ByteSizeValue(10 * 1024 * 1024),
  eviction: { minPayloadSize: new ByteSizeValue(10 * 1024) },
  collectQueueMetrics: false,
  ...defaultExecutionIndexConfig,
});

export const createMockLogger = (): Logger =>
  ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  } as unknown as Logger);

export const createFakeKibanaRequest = (): KibanaRequest => ({ headers: {} } as KibanaRequest);

export interface MockWorkflowRuntime {
  start: jest.Mock;
  resume: jest.Mock;
  getWorkflowExecutionStatus: jest.Mock;
  getWorkflowExecution: jest.Mock;
}

export const createMockWorkflowRuntime = (): MockWorkflowRuntime => ({
  start: jest.fn().mockResolvedValue(undefined),
  resume: jest.fn().mockResolvedValue(undefined),
  getWorkflowExecutionStatus: jest.fn().mockReturnValue(ExecutionStatus.COMPLETED),
  getWorkflowExecution: jest.fn().mockReturnValue({
    isTestRun: false,
    status: ExecutionStatus.COMPLETED,
  }),
});

export interface MockWorkflowExecutionRepository {
  getWorkflowExecutionById: jest.Mock;
  updateWorkflowExecution: jest.Mock;
}

export const createMockWorkflowExecutionRepository = (): MockWorkflowExecutionRepository => ({
  getWorkflowExecutionById: jest.fn().mockResolvedValue(null),
  updateWorkflowExecution: jest.fn().mockResolvedValue(undefined),
});

export interface MockTelemetryClient {
  reportEventDrivenExecutionSuppressed: jest.Mock;
}

export const createMockTelemetryClient = (): MockTelemetryClient => ({
  reportEventDrivenExecutionSuppressed: jest.fn(),
});

export const buildMockSetupDependenciesReturn = (options: {
  workflowRuntime: MockWorkflowRuntime;
  workflowExecutionRepository: MockWorkflowExecutionRepository;
  telemetryClient?: MockTelemetryClient;
}): Awaited<ReturnType<typeof setupDependencies>> =>
  ({
    workflowRuntime: options.workflowRuntime,
    stepExecutionRuntimeFactory: {},
    workflowExecutionState: {
      getWorkflowExecution: jest.fn().mockReturnValue({ status: ExecutionStatus.WAITING }),
      getLastFailedStepContext: jest.fn(),
    },
    workflowLogger: {},
    nodesFactory: {},
    workflowExecutionGraph: {},
    workflowTaskManager: {},
    workflowExecutionRepository: options.workflowExecutionRepository,
    esClient: {},
    telemetryClient: options.telemetryClient ?? createMockTelemetryClient(),
  } as unknown as Awaited<ReturnType<typeof setupDependencies>>);

/** Payload passed to `workflowExecutionLoop` from `runWorkflow` / `resumeWorkflow` (mocked deps). */
export const getExpectedWorkflowExecutionLoopCallArgs = (options: {
  workflowRuntime: MockWorkflowRuntime;
  workflowExecutionRepository: MockWorkflowExecutionRepository;
  dependencies: ContextDependencies;
  fakeRequest: KibanaRequest;
  taskAbortController: AbortController;
}) => ({
  workflowRuntime: options.workflowRuntime,
  stepExecutionRuntimeFactory: {},
  workflowExecutionState: expect.any(Object),
  workflowExecutionRepository: options.workflowExecutionRepository,
  workflowLogger: {},
  nodesFactory: {},
  workflowExecutionGraph: {},
  esClient: {},
  fakeRequest: options.fakeRequest,
  coreStart: options.dependencies.coreStart,
  taskAbortController: options.taskAbortController,
  workflowTaskManager: {},
});
