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
import type { EsWorkflowExecution } from '@kbn/workflows';
import { ExecutionStatus } from '@kbn/workflows';

import type { setupDependencies } from './setup_dependencies';
import type { WorkflowsExecutionEngineConfig } from '../config';
import type { EsDocumentWithVersion } from '../repositories/document_version';
import type { ContextDependencies } from '../workflow_context_manager/types';

/**
 * Builds the `EsDocumentWithVersion` wrapper that `runWorkflow` / `resumeWorkflow` /
 * `setupDependencies` now receive in place of a bare `workflowRunId`.
 */
export const createWorkflowExecutionWithVersion = (
  id: string,
  doc: Partial<EsWorkflowExecution> = {}
): EsDocumentWithVersion<EsWorkflowExecution> => ({
  id,
  doc: { id, ...doc } as EsWorkflowExecution,
  version: {
    index: '.ds-.workflows-executions-2026.06.22-000001',
    seqNo: 1,
    primaryTerm: 1,
  },
});

export const createMockWorkflowExecutionEngineConfig = (): WorkflowsExecutionEngineConfig => ({
  enabled: true,
  eventDriven: { enabled: true, logEvents: true, maxChainDepth: 10 },
  maxWorkflowDepth: 10,
  logging: { console: true },
  http: { allowedHosts: ['*'] },
  maxResponseSize: new ByteSizeValue(10 * 1024 * 1024),
  eviction: { minPayloadSize: new ByteSizeValue(10 * 1024) },
  collectQueueMetrics: false,
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
      getWorkflowExecution: jest
        .fn()
        .mockReturnValue({ id: 'test-workflow-run-id', status: ExecutionStatus.WAITING }),
      getWorkflowExecutionVersion: jest.fn().mockReturnValue({
        index: '.ds-.workflows-executions-2026.06.22-000001',
        seqNo: 1,
        primaryTerm: 1,
      }),
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
