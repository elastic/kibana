/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

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
import type { StepIoService } from '../step_io_service';
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

const createLightweightRenderPayload = () => ({
  summary:
    'A={{ steps.fetchCaseA.output.case.title }}, ' +
    'B={{ steps.fetchCaseB.output.case.title }}, ' +
    'C={{ steps.fetchCaseC.output.case.title }}',
});

const createBroaderSurfaceContainer = () => {
  const largeStepOutputs = {
    fetchCaseA: createLargeStepOutput('fetchCaseA'),
    fetchCaseB: createLargeStepOutput('fetchCaseB'),
    fetchCaseC: createLargeStepOutput('fetchCaseC'),
  } as const;

  const renderSpy = jest.fn();

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
        // Metadata only — IO lives in the IO service mock below.
        return {
          id: stepId,
          stepId,
          state: { fetched: true, stepId },
          error: undefined,
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
  const actualRender = templatingEngine.render.bind(templatingEngine);
  jest.spyOn(templatingEngine, 'render').mockImplementation((obj, context) => {
    renderSpy(context);
    return actualRender(obj, context);
  });

  // IO maps live entirely in the service mock now (state holds metadata only).
  const stepIoService = {
    hasEvictedOutputs: jest.fn().mockReturnValue(false),
    prepareForRead: jest.fn().mockResolvedValue(undefined),
    releaseTransientlyRehydratedOutputs: jest.fn(),
    getStepInput: jest.fn().mockReturnValue(undefined),
    getStepOutput: jest.fn(
      (id: string) =>
        (largeStepOutputs as Record<string, unknown>)[id as keyof typeof largeStepOutputs]
    ),
    getStepError: jest.fn().mockReturnValue(undefined),
    getLatestStepIO: jest.fn((stepId: string) => {
      if (stepId in largeStepOutputs) {
        return {
          input: undefined,
          output: largeStepOutputs[stepId as keyof typeof largeStepOutputs],
          error: undefined,
        };
      }
      return undefined;
    }),
    getDataSetVariables: jest.fn((): Record<string, unknown> => ({})),
  } as unknown as StepIoService;

  const contextManager = new WorkflowContextManager({
    templateEngine: templatingEngine,
    node,
    stackFrames: [],
    workflowExecutionGraph,
    workflowExecutionState,
    stepIoService,
    esClient,
    dependencies,
    fakeRequest: {} as KibanaRequest,
    coreStart: {} as CoreStart,
  });

  return {
    contextManager,
    renderSpy,
    largeStepOutputs,
  };
};

describe('WorkflowContextManager post-fix regressions', () => {
  it('narrows the render context to referenced paths only, excluding heavy predecessor fields', () => {
    const { contextManager, renderSpy, largeStepOutputs } = createBroaderSurfaceContainer();

    const rendered = contextManager.renderValueAccordingToContext(createLightweightRenderPayload());

    expect(rendered.summary).toBe(
      'A=Synthetic large case, B=Synthetic large case, C=Synthetic large case'
    );

    expect(renderSpy).toHaveBeenCalledTimes(1);
    const passedContext = renderSpy.mock.calls[0][0] as {
      steps: Record<string, { output?: { case?: Record<string, unknown> } }>;
    };

    for (const stepId of ['fetchCaseA', 'fetchCaseB', 'fetchCaseC'] as const) {
      const stepCase = passedContext.steps[stepId]?.output?.case;
      expect(stepCase).toBeDefined();
      expect(stepCase).toHaveProperty('title', 'Synthetic large case');
      expect(stepCase).not.toHaveProperty('comments');
      expect(stepCase).not.toHaveProperty('customFields');
      expect(stepCase).not.toHaveProperty('description');
    }

    const narrowedSize = JSON.stringify(passedContext).length;
    const fullStepsSize = JSON.stringify(largeStepOutputs).length;
    // The narrowed context must be orders of magnitude smaller than the full step outputs;
    // this is what keeps template rendering from walking the 500-comment array on every call.
    expect(narrowedSize * 100).toBeLessThan(fullStepsSize);
  });

  it('reuses the same narrowed context shape across repeated lightweight renders', () => {
    const { contextManager, renderSpy } = createBroaderSurfaceContainer();

    for (let index = 0; index < 5; index++) {
      contextManager.renderValueAccordingToContext(createLightweightRenderPayload());
    }

    expect(renderSpy).toHaveBeenCalledTimes(5);
    const stepsSnapshots = renderSpy.mock.calls.map(([ctx]) =>
      JSON.stringify((ctx as { steps: unknown }).steps)
    );
    expect(new Set(stepsSnapshots).size).toBe(1);
  });
});
