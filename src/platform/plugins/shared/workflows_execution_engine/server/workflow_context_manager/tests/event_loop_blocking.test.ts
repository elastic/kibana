/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { performance } from 'node:perf_hooks';
import { setImmediate as setImmediateAsync } from 'node:timers/promises';
import type { CoreStart, KibanaRequest } from '@kbn/core/server';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type {
  ConnectorStep,
  EsWorkflowExecution,
  EsWorkflowStepExecution,
  StackFrame,
  WorkflowYaml,
} from '@kbn/workflows';
import type { AtomicGraphNode } from '@kbn/workflows/graph';
import { WorkflowGraph } from '@kbn/workflows/graph';
import { mockContextDependencies } from '../../execution_functions/__mock__/context_dependencies';
import { WorkflowTemplatingEngine } from '../../templating_engine';
import { WorkflowContextManager } from '../workflow_context_manager';
import type { WorkflowExecutionState } from '../workflow_execution_state';

jest.mock('../../utils', () => ({
  ...jest.requireActual<typeof import('../../utils')>('../../utils'),
  buildStepExecutionId: jest.fn().mockImplementation((executionId: string, stepId: string) => {
    return `${stepId}_generated`;
  }),
  getKibanaUrl: jest.fn().mockReturnValue('http://localhost:5601'),
  buildWorkflowExecutionUrl: jest
    .fn()
    .mockImplementation(
      (
        kibanaUrl: string,
        spaceId: string,
        workflowId: string,
        executionId: string,
        stepExecutionId?: string
      ) => {
        const spacePrefix = spaceId === 'default' ? '' : `/s/${spaceId}`;
        const baseUrl = `${kibanaUrl}${spacePrefix}/app/workflows/${workflowId}`;
        const params = new URLSearchParams({
          executionId,
          tab: 'executions',
        });
        if (stepExecutionId) {
          params.set('stepExecutionId', stepExecutionId);
        }
        return `${baseUrl}?${params.toString()}`;
      }
    ),
}));

const dependencies = mockContextDependencies();

const createLargeCaseOutput = () => {
  const repeatedCommentBody = `# Root Cause Analysis\n${'The workflow engine is carrying too much accumulated case context. '.repeat(
    350
  )}`;

  const comments = Array.from({ length: 500 }, (_, index) => ({
    id: `comment-${index}`,
    type: 'user',
    owner: 'observability',
    created_at: '2026-04-22T10:00:00.000Z',
    comment: `${repeatedCommentBody}\ncomment=${index}`,
  }));

  return {
    id: 'case-1',
    title: 'Synthetic large case',
    description: 'Synthetic case used to reproduce event loop blocking in tests',
    totalComment: comments.length,
    totalAlerts: 5,
    customFields: [
      {
        key: 'system_environment',
        type: 'text',
        value: 'trading-na',
      },
    ],
    comments,
  };
};

const createLargeStepOutput = (stepId: string) => ({
  step_id: stepId,
  case: createLargeCaseOutput(),
  metadata: {
    source: 'kibana.request',
    correlation_id: `${stepId}-correlation`,
  },
});

const createCombinedRenderPayload = () => ({
  combinedCases:
    '{{ steps.fetchCaseA.output.case | json }}{{ steps.fetchCaseB.output.case | json }}{{ steps.fetchCaseC.output.case | json }}',
  summary:
    'A={{ steps.fetchCaseA.output.case.title }}, ' +
    'B={{ steps.fetchCaseB.output.case.title }}, ' +
    'C={{ steps.fetchCaseC.output.case.title }}',
});

const createLightweightRenderPayload = () => ({
  summary:
    'A={{ steps.fetchCaseA.output.case.title }}, ' +
    'B={{ steps.fetchCaseB.output.case.title }}, ' +
    'C={{ steps.fetchCaseC.output.case.title }}',
});

const createTestContainer = (largeOutput: ReturnType<typeof createLargeCaseOutput>) => {
  const workflow: WorkflowYaml = {
    name: 'Large Context Workflow',
    version: '1',
    description: 'Minimal repro workflow',
    enabled: true,
    consts: {},
    triggers: [],
    steps: [
      {
        name: 'fetchLargeCase',
        type: 'console',
        with: {
          message: 'fetch',
        },
      } as ConnectorStep,
      {
        name: 'renderLargeCase',
        type: 'console',
        with: {
          message: '{{ steps.fetchLargeCase.output.title }}',
        },
      } as ConnectorStep,
    ],
  };

  const node: AtomicGraphNode = {
    id: 'renderLargeCase',
    type: 'atomic',
    stepId: 'renderLargeCase',
    stepType: 'console',
    configuration: {},
  };

  const workflowExecutionGraph = WorkflowGraph.fromWorkflowDefinition(workflow);
  const workflowExecutionState: WorkflowExecutionState = {} as WorkflowExecutionState;
  workflowExecutionState.getWorkflowExecution = jest.fn().mockReturnValue({
    scopeStack: [] as StackFrame[],
    workflowDefinition: workflow,
  } as EsWorkflowExecution);
  workflowExecutionState.getLatestStepExecution = jest
    .fn()
    .mockImplementation((stepId: string): Partial<EsWorkflowStepExecution> | undefined => {
      if (stepId === 'fetchLargeCase') {
        return {
          state: { fetched: true },
          input: undefined,
          output: largeOutput,
          error: null,
        };
      }

      return undefined;
    });
  workflowExecutionState.getStepExecution = jest.fn().mockReturnValue(undefined);
  workflowExecutionState.getAllStepExecutions = jest.fn().mockReturnValue([]);

  const esClient = {
    search: jest.fn(),
    index: jest.fn(),
    get: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  } as unknown as ElasticsearchClient;

  const templatingEngine = new WorkflowTemplatingEngine();

  const contextManager = new WorkflowContextManager({
    templateEngine: templatingEngine,
    node,
    stackFrames: [],
    workflowExecutionGraph,
    workflowExecutionState,
    esClient,
    dependencies,
    fakeRequest: {} as KibanaRequest,
    coreStart: {} as CoreStart,
  });

  return {
    contextManager,
    templatingEngine,
  };
};

const createBroaderSurfaceContainer = () => {
  const largeStepOutputs = {
    fetchCaseA: createLargeStepOutput('fetchCaseA'),
    fetchCaseB: createLargeStepOutput('fetchCaseB'),
    fetchCaseC: createLargeStepOutput('fetchCaseC'),
  } as const;

  const workflow: WorkflowYaml = {
    name: 'Broader Surface Repro Workflow',
    version: '1',
    description: 'Exercises predecessor accumulation and template rendering',
    enabled: true,
    consts: {},
    triggers: [],
    steps: [
      {
        name: 'fetchCaseA',
        type: 'console',
        with: {
          message: 'fetch-a',
        },
      } as ConnectorStep,
      {
        name: 'fetchCaseB',
        type: 'console',
        with: {
          message: 'fetch-b',
        },
      } as ConnectorStep,
      {
        name: 'fetchCaseC',
        type: 'console',
        with: {
          message: 'fetch-c',
        },
      } as ConnectorStep,
      {
        name: 'renderCombinedPayload',
        type: 'console',
        with: {
          message: '{{ steps.fetchCaseA.output.case.title }}',
        },
      } as ConnectorStep,
    ],
  };

  const node: AtomicGraphNode = {
    id: 'renderCombinedPayload',
    type: 'atomic',
    stepId: 'renderCombinedPayload',
    stepType: 'console',
    configuration: {},
  };

  const workflowExecutionGraph = WorkflowGraph.fromWorkflowDefinition(workflow);
  const workflowExecutionState: WorkflowExecutionState = {} as WorkflowExecutionState;
  workflowExecutionState.getWorkflowExecution = jest.fn().mockReturnValue({
    scopeStack: [] as StackFrame[],
    workflowDefinition: workflow,
  } as EsWorkflowExecution);
  workflowExecutionState.getLatestStepExecution = jest
    .fn()
    .mockImplementation((stepId: string): Partial<EsWorkflowStepExecution> | undefined => {
      if (stepId in largeStepOutputs) {
        return {
          state: { fetched: true, stepId },
          input: undefined,
          output: largeStepOutputs[stepId as keyof typeof largeStepOutputs],
          error: null,
        };
      }

      return undefined;
    });
  workflowExecutionState.getStepExecution = jest.fn().mockReturnValue(undefined);
  workflowExecutionState.getAllStepExecutions = jest.fn().mockReturnValue([]);

  const esClient = {
    search: jest.fn(),
    index: jest.fn(),
    get: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  } as unknown as ElasticsearchClient;

  const templatingEngine = new WorkflowTemplatingEngine();

  const contextManager = new WorkflowContextManager({
    templateEngine: templatingEngine,
    node,
    stackFrames: [],
    workflowExecutionGraph,
    workflowExecutionState,
    esClient,
    dependencies,
    fakeRequest: {} as KibanaRequest,
    coreStart: {} as CoreStart,
  });

  return {
    contextManager,
  };
};

describe('event loop blocking minimal local reproduction', () => {
  it('shows measurable synchronous blocking from large context serialization', async () => {
    const largeOutput = createLargeCaseOutput();
    const { contextManager, templatingEngine } = createTestContainer(largeOutput);

    await setImmediateAsync();

    const context = contextManager.getContext();
    let timerDriftMs = 0;
    const timerStartedAt = performance.now();
    const blockedTimer = new Promise<void>((resolve) => {
      setTimeout(() => {
        timerDriftMs = performance.now() - timerStartedAt;
        resolve();
      }, 0);
    });

    const serializeStart = performance.now();
    const serializedContext = JSON.stringify(context);
    const serializeElapsed = performance.now() - serializeStart;

    const renderStart = performance.now();
    const rendered = templatingEngine.render('{{ steps.fetchLargeCase.output | json }}', context);
    const renderElapsed = performance.now() - renderStart;

    await blockedTimer;

    expect(serializedContext.length).toBeGreaterThan(5_000_000);
    expect(rendered.length).toBeGreaterThan(5_000_000);

    // Keep thresholds conservative so the test remains stable across machines.
    expect(serializeElapsed).toBeGreaterThan(10);
    expect(renderElapsed).toBeGreaterThan(10);
    expect(timerDriftMs).toBeGreaterThan(10);
  });

  it('shows measurable blocking through renderValueAccordingToContext with accumulated predecessor state', async () => {
    const { contextManager } = createBroaderSurfaceContainer();

    await setImmediateAsync();

    let timerDriftMs = 0;
    const timerStartedAt = performance.now();
    const blockedTimer = new Promise<void>((resolve) => {
      setTimeout(() => {
        timerDriftMs = performance.now() - timerStartedAt;
        resolve();
      }, 0);
    });

    const renderStart = performance.now();
    const rendered = contextManager.renderValueAccordingToContext(createCombinedRenderPayload());
    const renderElapsed = performance.now() - renderStart;

    await blockedTimer;

    expect(typeof rendered.combinedCases).toBe('string');
    expect((rendered.combinedCases as string).length).toBeGreaterThan(15_000_000);
    expect(rendered.summary).toContain('A=Synthetic large case');
    expect(renderElapsed).toBeGreaterThan(20);
    expect(timerDriftMs).toBeGreaterThan(10);
  });

  it('keeps timer drift low for repeated lightweight renders over large predecessor context after the fix', async () => {
    const { contextManager } = createBroaderSurfaceContainer();

    await setImmediateAsync();

    const warmupIterations = 10;
    const iterations = 250;
    let timerDriftMs = 0;
    let totalElapsedMs = 0;
    let lastSummary = '';

    for (let index = 0; index < warmupIterations; index++) {
      const rendered = contextManager.renderValueAccordingToContext(
        createLightweightRenderPayload()
      );
      lastSummary = String(rendered.summary);
    }

    const timerStartedAt = performance.now();
    const blockedTimer = new Promise<void>((resolve) => {
      setTimeout(() => {
        timerDriftMs = performance.now() - timerStartedAt;
        resolve();
      }, 0);
    });

    const workStartedAt = performance.now();

    for (let index = 0; index < iterations; index++) {
      const rendered = contextManager.renderValueAccordingToContext(
        createLightweightRenderPayload()
      );
      lastSummary = String(rendered.summary);
    }

    totalElapsedMs = performance.now() - workStartedAt;

    await blockedTimer;

    expect(lastSummary).toBe(
      'A=Synthetic large case, B=Synthetic large case, C=Synthetic large case'
    );
    expect(timerDriftMs).toBeLessThan(50);
    expect(totalElapsedMs).toBeLessThan(50);
  });
});
