/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AtomicGraphNode } from '@kbn/workflows/graph';
import { ExecutionError } from '@kbn/workflows/server';
import type {
  PhaseDoneResult,
  PhaseErrorResult,
  PollHandlerContext,
  RunHandoffResult,
  ServerStepDefinition,
  StepHandlerContext,
} from '@kbn/workflows-extensions/server';
import { POLL_AUTHOR_STATE_KEY, POLL_BOOKKEEPING_KEY } from './constants';
import { CustomStepPollRunner } from './custom_step_poll_runner';
import type { ConnectorExecutor } from '../../connector_executor';
import type { StepExecutionRuntime } from '../../workflow_context_manager/step_execution_runtime';
import type { WorkflowExecutionRuntimeManager } from '../../workflow_context_manager/workflow_execution_runtime_manager';
import type { IWorkflowEventLogger } from '../../workflow_event_logger';
import type { BaseStep, CancellableNode, RunStepResult } from '../node_implementation';
import { BaseAtomicNodeImplementation } from '../node_implementation';
import type { PollBookkeeping } from '../poll_scheduler';

interface PersistedPollState {
  [POLL_BOOKKEEPING_KEY]?: PollBookkeeping;
  [POLL_AUTHOR_STATE_KEY]?: unknown;
  [key: string]: unknown;
}

/**
 * Orchestrates extension-registered custom workflow steps: routes to the legacy
 * `handler`, the `run` + `poll` hand-off, or poll-only execution via
 * {@link CustomStepPollRunner}.
 *
 * Modes:
 * - **`handler`** — single-shot; one invocation, finalize.
 * - **`poll` only** — first execution invokes poll immediately; wake-ups use
 *   {@link CustomStepPollRunner}.
 * - **`run` + `poll`** — `run` may finalize synchronously or hand off to the poll runner.
 *
 * When the step definition provides an `onCancel` handler, instances expose
 * `CancellableNode.onCancel` so the engine can run cleanup from `WAITING` as well.
 */
export class CustomStepImpl extends BaseAtomicNodeImplementation<BaseStep> {
  private readonly pollRunner: CustomStepPollRunner;

  constructor(
    private node: AtomicGraphNode,
    private stepDefinition: ServerStepDefinition,
    stepExecutionRuntime: StepExecutionRuntime,
    connectorExecutor: ConnectorExecutor,
    workflowExecutionRuntime: WorkflowExecutionRuntimeManager,
    private workflowLogger: IWorkflowEventLogger
  ) {
    const baseStep: BaseStep = {
      name: node.stepId,
      stepId: node.stepId,
      type: node.stepType,
      'max-step-size': node.configuration['max-step-size'],
    };
    super(baseStep, stepExecutionRuntime, connectorExecutor, workflowExecutionRuntime);

    this.pollRunner = new CustomStepPollRunner(
      node,
      stepDefinition,
      stepExecutionRuntime,
      workflowLogger,
      this.createPollHandlerContext.bind(this)
    );

    if (stepDefinition.onCancel) {
      const onCancelFn = stepDefinition.onCancel;
      (this as unknown as CancellableNode).onCancel = async () => {
        await onCancelFn(this.createHandlerContext(this.getInput()));
      };
    }
  }

  /**
   * Get and validate the input for this step
   */
  public override getInput(): Record<string, unknown> {
    const withData = this.node.configuration.with || {};
    return this.stepExecutionRuntime.contextManager.renderValueAccordingToContext(withData);
  }

  /**
   * Execute the step: resume poll loop if bookkeeping exists, otherwise first invocation.
   */
  protected override async _run(input: unknown): Promise<RunStepResult> {
    const persistedState = (this.stepExecutionRuntime.getCurrentStepState() ??
      {}) as PersistedPollState;
    const bookkeeping = persistedState[POLL_BOOKKEEPING_KEY];

    try {
      if (bookkeeping) {
        return await this.pollRunner.resumeAfterPollWake(
          input,
          bookkeeping,
          persistedState[POLL_AUTHOR_STATE_KEY]
        );
      }
      return await this.executeFirstInvocation(input);
    } catch (err) {
      const error = ExecutionError.fromError(err).toSerializableObject();
      return { input, output: undefined, error };
    }
  }

  /**
   * First execution (no `__poll` yet): `handler`, `run`+`poll`, or poll-only.
   */
  private async executeFirstInvocation(input: unknown): Promise<RunStepResult> {
    const { handler, run, poll } = this.stepDefinition;

    if (handler) {
      const result = await handler(this.createHandlerContext(input));
      return this.toRunStepResult(input, result);
    }

    if (run) {
      if (!poll) {
        throw new Error(
          `Step "${this.node.stepType}" defines "run" without "poll". Single-shot steps must use "handler".`
        );
      }
      const result = await run(this.createHandlerContext(input));
      const handoff = this.extractRunHandoff(result);
      if (!handoff) {
        return this.toRunStepResult(input, result as PhaseDoneResult<unknown> | PhaseErrorResult);
      }
      return this.pollRunner.scheduleNextPoll(input, handoff.state, /* attempt */ 0);
    }

    if (poll) {
      return this.pollRunner.runFirstPoll(input);
    }

    throw new Error(
      `Step "${this.node.stepType}" has no executable phase (handler/run/poll missing).`
    );
  }

  private toRunStepResult(
    input: unknown,
    result: PhaseDoneResult<unknown> | PhaseErrorResult | { output?: unknown; error?: Error }
  ): RunStepResult {
    if (result.error) {
      return {
        input,
        output: undefined,
        error: ExecutionError.fromError(result.error).toSerializableObject(),
      };
    }
    return { input, output: result.output, error: undefined };
  }

  private extractRunHandoff(result: unknown): RunHandoffResult<unknown> | null {
    if (
      result &&
      typeof result === 'object' &&
      'state' in result &&
      !('output' in result && (result as { output?: unknown }).output !== undefined) &&
      !(result as { error?: Error }).error
    ) {
      return result as RunHandoffResult<unknown>;
    }
    return null;
  }

  private createHandlerContext(input: unknown): StepHandlerContext {
    return {
      input,
      rawInput: this.node.configuration.with || {},
      config: this.node.configuration, // TODO: pick only the config properties that are defined in the step definition
      contextManager: {
        getContext: () => {
          return this.stepExecutionRuntime.contextManager.getContext();
        },
        getScopedEsClient: () => {
          return this.stepExecutionRuntime.contextManager.getEsClientAsUser();
        },
        renderInputTemplate: (value, additionalContext) => {
          return this.stepExecutionRuntime.contextManager.renderValueAccordingToContext(
            value,
            additionalContext
          );
        },
        getFakeRequest: () => {
          return this.stepExecutionRuntime.contextManager.getFakeRequest();
        },
      },
      logger: {
        debug: (message, meta) => this.workflowLogger.logDebug(message, meta),
        info: (message, meta) => this.workflowLogger.logInfo(message, meta),
        warn: (message, meta) => this.workflowLogger.logWarn(message, meta),
        error: (message, error) => this.workflowLogger.logError(message, error),
      },
      abortSignal: this.stepExecutionRuntime.abortController.signal,
      stepId: this.node.stepId,
      stepType: this.node.stepType,
    };
  }

  private createPollHandlerContext(
    input: unknown,
    authorState: unknown,
    attempt: number
  ): PollHandlerContext {
    return {
      ...this.createHandlerContext(input),
      state: authorState,
      attempt,
    };
  }
}
