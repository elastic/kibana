/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Runs a shipped managed workflow through the REAL execution engine with every
 * outside boundary faked: custom steps, `kibana.request` steps, `elasticsearch.*`
 * steps, and child workflows.
 *
 * The engine, the YAML, the Liquid templates, `if`, `switch`, `on-failure`, and
 * `workflow.output` are all real. The fakes only decide what each boundary
 * returns, and the harness records every call so a test can describe the ending.
 *
 * Use the `@kbn/test/jest_integration_node` preset. Under the default
 * `@kbn/test/jest_integration` preset, the engine reads every Kibana response
 * body as empty.
 */

import { AsyncLocalStorage } from 'node:async_hooks';
import { of } from 'rxjs';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { EsWorkflowExecution } from '@kbn/workflows';
import {
  ExecutionStatus,
  StepCategory,
  WORKFLOWS_CORE_SELF_CLIENT_ENABLED_FLAG,
} from '@kbn/workflows';
import {
  createServerStepDefinition,
  type ServerStepDefinition,
} from '@kbn/workflows-extensions/server';
import { z } from '@kbn/zod/v4';
import type { ParsedWorkflow } from './workflow_coverage';
import { WorkflowRunFixture } from './workflow_run_fixture';
import { WorkflowContextManager } from '../server/workflow_context_manager/workflow_context_manager';

type Output = Record<string, unknown>;

/** A custom step fake: its output, or a function of the step input. Throw to fail the step. */
export type FakeStep = Output | ((input: Output, stepId: string) => Output);

export interface KibanaApiCall {
  readonly method: string;
  readonly path: string;
  readonly body: unknown;
}

export interface KibanaApiResponse {
  readonly status: number;
  readonly body: unknown;
}

/** A `kibana.request` step fake: the response, or a function of the request. */
export type FakeKibanaStep = KibanaApiResponse | ((request: KibanaApiCall) => KibanaApiResponse);

/** A request that an `elasticsearch.*` step sends, as the engine builds it. */
export interface ElasticsearchCall {
  readonly method: string;
  readonly path: string;
  readonly body: unknown;
}

/** An `elasticsearch.*` step fake: the response body, or a function of the request. Throw to fail the step. */
export type FakeElasticsearchStep = Output | ((request: ElasticsearchCall) => Output);

/** A child workflow fake: its output, or a function of its inputs. Throw to fail the child run. */
export type FakeChildWorkflow = Output | ((inputs: Output, parentStepId: string) => Output);

export interface ManagedWorkflowFakes {
  /** Custom steps, by step type. */
  readonly steps?: Readonly<Record<string, FakeStep>>;
  /** `kibana.request` steps, by step name. */
  readonly kibanaSteps?: Readonly<Record<string, FakeKibanaStep>>;
  /** `elasticsearch.*` steps, by step name. */
  readonly elasticsearchSteps?: Readonly<Record<string, FakeElasticsearchStep>>;
  /** `workflow.execute` children, by child workflow id. */
  readonly childWorkflows?: Readonly<Record<string, FakeChildWorkflow>>;
}

export interface RecordedCall {
  readonly kind: 'step' | 'kibana' | 'elasticsearch' | 'child';
  /** The step that made the call. */
  readonly stepId: string;
  /** The step type, or the child workflow id for a child call. */
  readonly type: string;
  /** The step input, the HTTP request (`method`, `path`, `body`), or the child inputs. */
  readonly input: unknown;
  /** True when the fake threw, returned an HTTP error, or failed the child run. */
  readonly failed: boolean;
}

export interface RunEnd {
  /** The `workflow.output` or `workflow.fail` step that ended the run, or `failed at <step>`. */
  readonly ends: string;
  /** Steps that failed while the run went on (`on-failure: continue`). Absent when none did. */
  readonly failedSteps?: readonly string[];
}

export interface ManagedWorkflowRun {
  readonly status: ExecutionStatus | undefined;
  readonly end: RunEnd;
  /** The error of the run, when it failed. */
  readonly error?: string;
  /** The `workflow.output` values, when the run completed. */
  readonly output?: Output;
  readonly calls: readonly RecordedCall[];
  /** Every step id the engine started, in any status. `on-failure` and `timeout` wrappers do not count. */
  readonly executedStepIds: readonly string[];
  /** Every step id that ended in a failed status, including steps the workflow continued after. */
  readonly failedStepIds: readonly string[];
}

const MAX_RESUMES = 25;
const SPACE_ID = 'fake_space_id';
const PARENT_EXECUTION_ID = 'fake_workflow_execution_id';

/**
 * Step types of the wrappers that the engine puts around a step with `on-failure` or
 * `timeout`. A wrapper has the step id of the step inside it and runs even when the
 * step itself does not, so it does not count as a run of the step.
 */
const WRAPPER_STEP_TYPES: ReadonlySet<string> = new Set([
  'fallback',
  'retry',
  'step_level_timeout',
  'workflow_level_timeout',
]);

const EMPTY_SEARCH = {
  took: 0,
  timed_out: false,
  _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
  hits: { hits: [] },
};

/** Captured before any test replaces it, so a replacement can call the real one. */
const realCallKibanaApi = WorkflowContextManager.prototype.callKibanaApi;

/** The `kibana.request` step that sends the current request. */
const kibanaStep = new AsyncLocalStorage<string>();

/** Reads a fake: a function computes the answer, any other value is the answer. */
const answer = <Args extends unknown[], Result>(
  fake: Result | ((...args: Args) => Result),
  ...args: Args
): Result => (typeof fake === 'function' ? (fake as (...a: Args) => Result)(...args) : fake);

/** A stored workflow document, enough for `WorkflowRepository.getWorkflow` to resolve a child. */
const childWorkflowDocument = (id: string) => ({
  ...EMPTY_SEARCH,
  hits: {
    hits: [
      {
        _id: id,
        _index: '.workflows-workflows',
        _source: {
          name: id,
          enabled: true,
          valid: true,
          created_at: '2026-01-01T00:00:00.000Z',
          updated_at: '2026-01-01T00:00:00.000Z',
          yaml: '',
          definition: { version: '1', name: id, enabled: true, triggers: [], steps: [] },
        },
      },
    ],
  },
});

type Recorder = ReturnType<typeof createRecorder>;

/** Records every faked call, and fails the call of `failStep` when a case names one. */
const createRecorder = (failStep?: string) => {
  const calls: RecordedCall[] = [];
  let failStepRan = false;

  /** Runs a fake and records the call. `isFailure` marks an answer that fails the step without a throw. */
  const record = <Result>(
    call: Omit<RecordedCall, 'failed'>,
    run: () => Result,
    isFailure: (result: Result) => boolean = () => false
  ): Result => {
    let result: Result;
    try {
      if (call.stepId === failStep) {
        failStepRan = true;
        throw new Error(`Injected failure in ${call.stepId}.`);
      }
      result = run();
    } catch (error) {
      calls.push({ ...call, failed: true });
      throw error;
    }
    calls.push({ ...call, failed: isFailure(result) });
    return result;
  };

  return { calls, record, failStepRan: () => failStepRan };
};

/** Custom steps. Both lookups, because the engine checks `hasStepDefinition` first. */
const fakeCustomSteps = (
  engine: WorkflowRunFixture,
  steps: ManagedWorkflowFakes['steps'] = {},
  { record }: Recorder
): void => {
  const definitions = new Map<string, ServerStepDefinition>(
    Object.entries(steps).map(([stepType, fake]) => [
      stepType,
      createServerStepDefinition({
        id: stepType,
        label: `${stepType} (fake)`,
        category: StepCategory.Kibana,
        description: 'Test fake that records its input and returns a chosen output.',
        inputSchema: z.object({}).passthrough(),
        outputSchema: z.object({}).passthrough(),
        handler: async ({ input, stepId }) => ({
          output: record({ kind: 'step', stepId, type: stepType, input }, () =>
            answer(fake, input as Output, stepId)
          ),
        }),
      }),
    ])
  );
  engine.dependencies.workflowsExtensions.hasStepDefinition = jest.fn((stepType: string) =>
    definitions.has(stepType)
  ) as never;
  engine.dependencies.workflowsExtensions.getStepDefinition = jest.fn((stepType: string) =>
    definitions.get(stepType)
  ) as never;
};

/**
 * `kibana.request` steps. The request goes through the real engine code to Core's
 * self client, which is faked. The engine does not pass the step to the self client,
 * so the harness keeps it in async local storage for the length of the call.
 * Returns the function that removes the fake.
 */
const fakeKibanaSteps = (
  engine: WorkflowRunFixture,
  kibanaSteps: ManagedWorkflowFakes['kibanaSteps'] = {},
  { record }: Recorder
): (() => void) => {
  const { coreStart } = engine.dependencies;
  coreStart.featureFlags.getBooleanValue$.mockImplementation((flag, defaultValue) =>
    of(flag === WORKFLOWS_CORE_SELF_CLIENT_ENABLED_FLAG || defaultValue)
  );
  Object.assign(engine.fakeKibanaRequest, {
    headers: { authorization: 'ApiKey managed-workflow-test' },
    isFakeRequest: true,
  });
  (coreStart.http.basePath.prepend as unknown as jest.Mock).mockImplementation(
    (path: string) => path
  );

  const fetch = async (path: string, options: { method?: string; body?: unknown } = {}) => {
    const stepId = kibanaStep.getStore() ?? 'unknown';
    const request = { method: options.method ?? 'GET', path, body: options.body };
    const { status, body } = record(
      { kind: 'kibana', stepId, type: 'kibana.request', input: request },
      () => {
        const fake = kibanaSteps[stepId];
        if (fake === undefined) {
          throw new Error(`No fake for Kibana step ${stepId}.`);
        }
        return answer(fake, request);
      },
      (response) => response.status >= 400
    );
    return {
      request: { url: `http://localhost:5601${path}` },
      response: new Response(JSON.stringify(body), {
        status,
        headers: { 'content-type': 'application/json' },
      }),
    };
  };
  (coreStart.http.selfClient as unknown as { asScoped: jest.Mock }).asScoped.mockReturnValue({
    fetch,
  });

  const spy = jest
    .spyOn(WorkflowContextManager.prototype, 'callKibanaApi')
    .mockImplementation(function (this: WorkflowContextManager, params) {
      return kibanaStep.run(this.node.stepId, () => realCallKibanaApi.call(this, params));
    });
  return () => spy.mockRestore();
};

/**
 * `elasticsearch.*` steps. Each one asks its context for a client and sends every
 * request through `transport.request`, so the client the harness hands out knows
 * its step. Returns the function that removes the fake.
 */
const fakeElasticsearchSteps = (
  elasticsearchSteps: ManagedWorkflowFakes['elasticsearchSteps'] = {},
  { record }: Recorder
): (() => void) => {
  const spy = jest
    .spyOn(WorkflowContextManager.prototype, 'getEsClientAsUser')
    .mockImplementation(function (this: WorkflowContextManager) {
      const { stepId, stepType } = this.node;
      const request = async (params: { method?: string; path?: string; body?: unknown }) => {
        const call = { method: params.method ?? 'GET', path: params.path ?? '', body: params.body };
        return record({ kind: 'elasticsearch', stepId, type: stepType, input: call }, () => {
          const fake = elasticsearchSteps[stepId];
          if (fake === undefined) {
            throw new Error(`No fake for Elasticsearch step ${stepId}.`);
          }
          return answer(fake, call);
        });
      };
      return { transport: { request } } as unknown as ElasticsearchClient;
    });
  return () => spy.mockRestore();
};

/**
 * Child workflows (`workflow.execute`). The engine looks the child up in the
 * workflows index, starts it, parks the parent, and reads the child execution
 * back on resume. The lookup and the start are faked, the park and the resume are real.
 */
const fakeChildWorkflows = (
  engine: WorkflowRunFixture,
  childWorkflows: ManagedWorkflowFakes['childWorkflows'] = {},
  { record }: Recorder
): void => {
  const childIds = Object.keys(childWorkflows);
  jest
    .mocked(engine.dependencies.coreStart.elasticsearch.client.asInternalUser.search)
    .mockImplementation((async (params: unknown) => {
      const searchRequest = JSON.stringify(params ?? {});
      const childId = childIds.find((id) => searchRequest.includes(`"${id}"`));
      return childId ? childWorkflowDocument(childId) : EMPTY_SEARCH;
    }) as never);

  let childCount = 0;
  engine.workflowsExecutionEngineMock.executeWorkflow.mockImplementation((async (
    childWorkflow: { id: string },
    context: { inputs?: Output; parentStepId?: string }
  ) => {
    const childExecutionId = `child_execution_${++childCount}`;
    const childInputs = context.inputs ?? {};
    const stepId = context.parentStepId ?? 'unknown';
    const base = {
      id: childExecutionId,
      spaceId: SPACE_ID,
      workflowId: childWorkflow.id,
      stepExecutionIds: [],
      createdAt: new Date().toISOString(),
    };
    let execution: Partial<EsWorkflowExecution>;
    try {
      const output = record(
        { kind: 'child', stepId, type: childWorkflow.id, input: childInputs },
        () => answer(childWorkflows[childWorkflow.id] ?? {}, childInputs, stepId)
      );
      execution = { ...base, status: ExecutionStatus.COMPLETED, context: { output } };
    } catch (error) {
      execution = {
        ...base,
        status: ExecutionStatus.FAILED,
        error: { type: 'Error', message: (error as Error).message },
      };
    }
    engine.workflowExecutionRepositoryMock.workflowExecutions.set(
      childExecutionId,
      execution as EsWorkflowExecution
    );
    return { workflowExecutionId: childExecutionId };
  }) as never);
};

const parentExecution = (engine: WorkflowRunFixture): EsWorkflowExecution | undefined =>
  engine.workflowExecutionRepositoryMock.workflowExecutions.get(PARENT_EXECUTION_ID);

const runStatus = (engine: WorkflowRunFixture): ExecutionStatus | undefined =>
  parentExecution(engine)?.status;

/** Reads how the run ended from the step executions the engine stored. */
const readRun = (
  engine: WorkflowRunFixture,
  workflow: ParsedWorkflow,
  calls: readonly RecordedCall[]
): ManagedWorkflowRun => {
  const status = runStatus(engine);
  const stepExecutions = [...engine.stepExecutionRepositoryMock.stepExecutions.values()];
  const failedExecutions = stepExecutions.filter((step) => step.status === ExecutionStatus.FAILED);
  const failedStepIds = [...new Set(failedExecutions.map(({ stepId }) => stepId))];
  // A step with `on-failure: continue`, and its `if` wrapper, cannot end the run.
  const continuedStepIds = new Set(
    workflow.steps
      .filter((step) => step.name && step['on-failure']?.continue)
      .flatMap(({ name }) => [name as string, `if_${name}`])
  );
  // A wrapper (`if`, timeout zone, fallback) fails together with the step inside
  // it. The inner step starts last, so the highest index is the step that failed.
  const latestFirst = [...failedExecutions].sort(
    (a, b) => b.globalExecutionIndex - a.globalExecutionIndex
  );
  const [failed] = [
    ...latestFirst.filter(({ stepId }) => !continuedStepIds.has(stepId)),
    ...latestFirst,
  ];
  // `workflow.fail` compiles to a `workflow.output` step, so this finds either one.
  const endStep = stepExecutions.find((step) => step.stepType === 'workflow.output');
  // That step ended the run, even when an earlier step failed and the run went on after it.
  const endStepId = endStep?.stepId ?? failed?.stepId;
  const completed = status === ExecutionStatus.COMPLETED;
  const failedSteps = failedStepIds.filter(
    (stepId) => workflow.stepNames.has(stepId) && stepId !== endStepId
  );

  return {
    status,
    end: {
      ends: completed
        ? endStepId ?? 'the last step'
        : `failed at ${endStepId ?? 'an unknown step'}`,
      ...(failedSteps.length > 0 && { failedSteps }),
    },
    // The run error, for example the message of a `workflow.fail` step, else the error of the step.
    error: completed
      ? undefined
      : parentExecution(engine)?.error?.message ?? failed?.error?.message,
    output: completed ? (endStep?.output as Output | undefined) : undefined,
    calls,
    executedStepIds: [
      ...new Set(
        stepExecutions
          .filter(({ stepType }) => !WRAPPER_STEP_TYPES.has(stepType ?? ''))
          .map(({ stepId }) => stepId)
      ),
    ],
    failedStepIds,
  };
};

/**
 * Runs the workflow once, driving every child workflow park to its end.
 * `failStep` names one step to fail, whatever its kind, to test its `on-failure` path.
 */
export const runManagedWorkflow = async ({
  workflow,
  inputs,
  fakes,
  failStep,
}: {
  workflow: ParsedWorkflow;
  inputs: Output;
  fakes: ManagedWorkflowFakes;
  failStep?: string;
}): Promise<ManagedWorkflowRun> => {
  const engine = new WorkflowRunFixture();
  const recorder = createRecorder(failStep);

  fakeCustomSteps(engine, fakes.steps, recorder);
  fakeChildWorkflows(engine, fakes.childWorkflows, recorder);
  const removeFakes = [
    fakeKibanaSteps(engine, fakes.kibanaSteps, recorder),
    fakeElasticsearchSteps(fakes.elasticsearchSteps, recorder),
  ];

  try {
    await engine.runWorkflow({ workflowYaml: workflow.yaml, inputs });
    for (let resumes = 0; runStatus(engine) === ExecutionStatus.WAITING_FOR_CHILD; resumes++) {
      if (resumes >= MAX_RESUMES) {
        throw new Error(`The workflow still waits for a child after ${MAX_RESUMES} resumes.`);
      }
      await engine.resumeWorkflow();
    }
  } finally {
    removeFakes.forEach((remove) => remove());
  }

  if (failStep !== undefined && !recorder.failStepRan()) {
    throw new Error(
      `failStep "${failStep}" never ran. Only a faked step that the run reaches can fail.`
    );
  }

  return readRun(engine, workflow, recorder.calls);
};
