/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import agent from 'elastic-apm-node';
import type { ServerStepDefinition } from '@kbn/workflows-extensions/server';
import type { WorkflowTemplatingEngine } from '../templating_engine';
import type { IWorkflowEventLogger } from '../workflow_event_logger';

interface SyncStep {
  name: string;
  type: string;
  with?: Record<string, unknown>;
}

export interface StepDispatchInput {
  step: SyncStep;
  /** Workflow-level context (event + accumulated step outputs). */
  context: Record<string, unknown>;
  executionLogger: IWorkflowEventLogger;
}

export interface StepDispatchResult {
  output: Record<string, unknown>;
  stepExecutionId: string;
}

/**
 * Handles per-step execution for the synchronous workflow execution path.
 *
 * Encapsulates: template resolution → handler invocation → step-level
 * event logging (start / complete / fail) → APM span lifecycle.
 *
 * The async (Task-Manager) path uses StepExecutionRuntime for equivalent
 * per-step lifecycle work. StepDispatcher is the sync-path peer.
 */
export class StepDispatcher {
  constructor(
    private readonly engine: WorkflowTemplatingEngine,
    private readonly getStepDefinition: (type: string) => ServerStepDefinition | undefined,
    private readonly executionId: string
  ) {}

  async dispatchStep(input: StepDispatchInput): Promise<StepDispatchResult> {
    const { step, context, executionLogger } = input;
    const { name: stepName, type: stepType, with: stepWith } = step;
    const stepExecutionId = `${this.executionId}_${stepName}`;

    const stepLogger = executionLogger.createStepLogger(
      stepExecutionId,
      stepName,
      stepName,
      stepType
    );

    const apmSpan = agent.startSpan(`step.${stepType}`, 'workflow.step') ?? undefined;
    const startedAt = Date.now();

    stepLogger.logInfo(`Step '${stepName}' started`, {
      workflow: { step_id: stepName, step_execution_id: stepExecutionId },
      event: { action: 'step-start', category: ['workflow', 'step'] },
      tags: ['workflow', 'step', 'start'],
      labels: { step_type: stepType, step_name: stepName, step_id: stepName },
    });

    try {
      const stepDef = this.getStepDefinition(stepType);
      if (!stepDef) {
        throw new Error(`[executeWorkflowSync] No step definition found for type "${stepType}"`);
      }

      const evaluatedInput = stepWith ? this.engine.render(stepWith, context) : {};

      const handlerContext = {
        input: evaluatedInput,
        rawInput: stepWith ?? {},
        config: {},
        contextManager: {
          getContext: () => ({ event: context.event, steps: context.steps }),
          getScopedEsClient: () => {
            throw new Error('[executeWorkflowSync] getScopedEsClient is not available');
          },
          renderInputTemplate: <T>(value: T) => this.engine.render(value, context),
          getFakeRequest: () => {
            throw new Error('[executeWorkflowSync] getFakeRequest is not available');
          },
        },
        logger: {
          debug: (msg: string, meta?: object) =>
            stepLogger.logDebug(msg, meta as Parameters<typeof stepLogger.logDebug>[1]),
          info: (msg: string, meta?: object) =>
            stepLogger.logInfo(msg, meta as Parameters<typeof stepLogger.logInfo>[1]),
          warn: (msg: string, meta?: object) =>
            stepLogger.logWarn(msg, meta as Parameters<typeof stepLogger.logWarn>[1]),
          error: (msg: string, error?: Error) => stepLogger.logError(msg, error),
        },
        abortSignal: new AbortController().signal,
        stepId: stepName,
        stepType,
      };

      const result = await stepDef.handler(handlerContext as never);
      const output = (result.output ?? {}) as Record<string, unknown>;
      const durationMs = Date.now() - startedAt;

      stepLogger.logInfo(`Step '${stepName}' completed`, {
        workflow: { step_id: stepName, step_execution_id: stepExecutionId },
        event: {
          action: 'step-complete',
          category: ['workflow', 'step'],
          outcome: 'success',
          duration: durationMs,
        },
        tags: ['workflow', 'step', 'complete'],
        labels: {
          step_type: stepType,
          step_name: stepName,
          step_id: stepName,
          execution_time_ms: durationMs,
        },
      });

      apmSpan?.setOutcome('success');
      apmSpan?.end();
      await stepLogger.flushEvents();

      return { output, stepExecutionId };
    } catch (err) {
      const durationMs = Date.now() - startedAt;
      const error = err instanceof Error ? err : new Error(String(err));

      stepLogger.logError(`Step '${stepName}' failed: ${error.message}`, error, {
        workflow: { step_id: stepName, step_execution_id: stepExecutionId },
        event: {
          action: 'step-fail',
          category: ['workflow', 'step'],
          outcome: 'failure',
          duration: durationMs,
        },
        tags: ['workflow', 'step', 'fail'],
        labels: {
          step_type: stepType,
          step_name: stepName,
          step_id: stepName,
          execution_time_ms: durationMs,
        },
      });

      apmSpan?.setOutcome('failure');
      apmSpan?.end();
      await stepLogger.flushEvents();

      throw err;
    }
  }
}
