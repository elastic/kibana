/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import apm from 'elastic-apm-node';
import type { AtomicGraphNode } from '@kbn/workflows/graph';
import { ExecutionError } from '@kbn/workflows/server';
import type { ServerStepDefinition, StepHandlerContext } from '@kbn/workflows-extensions/server';
import { ResponseSizeLimitError, safeOutputSize } from './errors';
import { handleStepResult } from './handle_step_result';
import { applyStepResult } from './helpers/apply_step_result';
import { WAITING_FOR_INPUT_STATE_KIND } from './helpers/enter_waiting_for_input';
import { resolveStepInput } from './helpers/resolve_step_input';
import type { BaseStep, CancellableNode, RunStepResult } from './node_implementation';
import { BaseAtomicNodeImplementation } from './node_implementation';
import type { ConnectorExecutor } from '../connector_executor';
import type { StepExecutionRuntime } from '../workflow_context_manager/step_execution_runtime';
import type { WorkflowExecutionRuntimeManager } from '../workflow_context_manager/workflow_execution_runtime_manager';
import type { IWorkflowEventLogger } from '../workflow_event_logger';

/**
 * Implementation for custom registered step types.
 *
 * This class executes custom step types registered via the registerStepType API.
 * It validates input against the step's schema, executes the handler function,
 * and validates the output.
 *
 * When the step definition provides an `onCancel` handler, instances expose
 * the `CancellableNode.onCancel` method so the execution engine can invoke
 * cleanup on cancellation.
 */
export class CustomStepImpl extends BaseAtomicNodeImplementation<BaseStep> {
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
    return resolveStepInput(this.node.configuration.with, this.stepExecutionRuntime.contextManager);
  }

  /**
   * Override run() to support the waitingForInput pause/resume cycle.
   *
   * On the initial run, if the handler returns waitingForInput, we:
   * 1. Persist step state so the resume run can read it.
   * 2. Set the step input (schema/message) so the execution record is self-contained.
   * 3. Call tryEnterWaitUntil to put the step (and via handle_execution_delay, the
   *    workflow) into WAITING_FOR_INPUT — then return without finishing the step.
   *
   * On the resume run (detected by the persisted kind sentinel), we:
   * 1. Call tryEnterWaitUntil again — it returns false, signalling "already waiting".
   * 2. Invoke the handler with isResuming=true so it can forward the input to the
   *    inner workflow and re-run the agent.
   * 3. Finish the step normally.
   */
  public override async run(): Promise<void> {
    if (this.stepExecutionRuntime.abortController.signal.aborted) {
      this.workflowExecutionRuntime.navigateToNextNode();
      return;
    }

    const savedState = this.stepExecutionRuntime.getCurrentStepState();
    const isResuming = savedState?.kind === WAITING_FOR_INPUT_STATE_KIND;

    const input = resolveStepInput(
      this.node.configuration.with,
      this.stepExecutionRuntime.contextManager
    );
    this.stepExecutionRuntime.startStep();

    const stepSpan = apm.startSpan(`step: ${this.step.name}`, 'workflow', this.step.type);
    if (stepSpan) {
      stepSpan.setLabel('step_name', this.step.name);
      stepSpan.setLabel('step_type', this.step.type);
      stepSpan.setLabel('step_id', this.stepExecutionRuntime.stepExecutionId);
    }

    try {
      this.stepExecutionRuntime.setInput(input);

      const handlerContext = this.createHandlerContext(input, isResuming, savedState);
      const result = await this.stepDefinition.handler(handlerContext);

      if (this.stepExecutionRuntime.abortController.signal.aborted) {
        if (stepSpan) {
          stepSpan.setOutcome('unknown');
          stepSpan.end();
        }
        return;
      }

      const stepResult = applyStepResult(result, isResuming);

      const outcome = handleStepResult(
        {
          failStep: (error) => this.stepExecutionRuntime.failStep(error),
          // Layer 2: enforce the per-step output-size limit before storing the
          // output in execution state. The base BaseAtomicNodeImplementation.run()
          // applies this guard around _run() (node_implementation.ts:171-214), but
          // this class overrides run() and routes the success path through
          // handleStepResult's finishStep, so the guard is re-applied here. The
          // thrown ResponseSizeLimitError propagates out of handleStepResult to
          // the catch at the bottom of run() and is routed to failStep.
          finishStep: (output) => {
            let measuredOutputSize: number | undefined;
            if (output != null) {
              const maxBytes = this.getMaxResponseBytes();
              if (maxBytes > 0) {
                const outputSize = safeOutputSize(output);
                // Fail closed on non-serializable outputs (null sentinel) — the
                // value cannot be persisted to ES, so silently allowing it through
                // would leak a payload of unknown size into in-memory state and
                // bypass both the size limit and eviction.
                if (outputSize === null) {
                  throw new ResponseSizeLimitError(maxBytes, this.step.name);
                }
                if (outputSize > maxBytes) {
                  throw new ResponseSizeLimitError(maxBytes, this.step.name, {
                    actualBytes: outputSize,
                  });
                }
                // Forward the already-computed size to finishStep so the IO service
                // can decide eviction without re-serialising.
                measuredOutputSize = outputSize;
              }
            }
            this.stepExecutionRuntime.finishStep(output, measuredOutputSize);
          },
          setCurrentStepState: (state) => this.stepExecutionRuntime.setCurrentStepState(state),
          setInput: (stepInput) => this.stepExecutionRuntime.setInput(stepInput),
          tryEnterWaitUntil: (deadline, status) =>
            this.stepExecutionRuntime.tryEnterWaitUntil(deadline, status),
        },
        {
          debug: (msg) => this.workflowLogger.logDebug(msg),
          error: (msg) => this.workflowLogger.logError(msg),
        },
        stepResult
      );

      if (outcome === 'waiting') {
        if (stepSpan) {
          stepSpan.setOutcome('unknown');
          stepSpan.end();
        }
        return; // Do NOT navigate — stay paused
      }
      if (outcome === 'failed') {
        if (stepSpan) {
          stepSpan.setOutcome('failure');
        }
      } else if (outcome === 'finished') {
        if (stepSpan) {
          stepSpan.setOutcome('success');
        }
      }
    } catch (error) {
      const runResult = this.handleFailure(input, error);
      this.stepExecutionRuntime.failStep(runResult.error || error);
      if (stepSpan) {
        stepSpan.setOutcome('failure');
      }
    } finally {
      if (stepSpan) {
        stepSpan.end();
      }
    }

    this.workflowExecutionRuntime.navigateToNextNode();
  }

  /**
   * Execute the custom step handler (called only from tests or when run() is not overridden).
   * The real execution path goes through the overridden run() above.
   */
  protected override async _run(input: unknown): Promise<RunStepResult> {
    try {
      const handlerContext = this.createHandlerContext(input);
      const result = await this.stepDefinition.handler(handlerContext);

      const stepResult: RunStepResult = { input, output: result.output, error: undefined };
      if (result.error) {
        stepResult.error = ExecutionError.fromError(result.error).toSerializableObject();
      }
      return stepResult;
    } catch (err) {
      const error = ExecutionError.fromError(err).toSerializableObject();
      return { input, output: undefined, error };
    }
  }

  /**
   * Create the handler context shared by both handler and onCancel.
   */
  private createHandlerContext(
    input: unknown,
    isResuming?: boolean,
    savedState?: Record<string, unknown>
  ): StepHandlerContext {
    const workflowExecution = this.stepExecutionRuntime.workflowExecution;
    const resumeInput = isResuming
      ? (workflowExecution?.context?.resumeInput as Record<string, unknown> | undefined)
      : undefined;

    // stepState exposed to handler = everything except the internal 'kind' sentinel
    const { kind: _kind, ...stepState } = savedState ?? {};
    const exposedStepState = isResuming && Object.keys(stepState).length ? stepState : undefined;

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
      isResuming: isResuming ?? false,
      resumeInput,
      stepState: exposedStepState,
    };
  }
}
