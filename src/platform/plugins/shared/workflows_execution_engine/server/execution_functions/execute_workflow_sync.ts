/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import agent from 'elastic-apm-node';
import { v4 as uuidv4 } from 'uuid';
import type { Logger } from '@kbn/logging';
import type { BaseStep, WorkflowYaml } from '@kbn/workflows';
import type { ServerStepDefinition } from '@kbn/workflows-extensions/server';
import { assertWorkflowLinearForSync } from './assert_workflow_linear_for_sync';
import { StepDispatcher } from '../step/step_dispatcher';
import { WorkflowTemplatingEngine } from '../templating_engine';
import type { IWorkflowEventLogger, IWorkflowEventLoggerService } from '../workflow_event_logger';

// BaseStep only carries name/type. Real steps also have if/with — extend here for inline execution.
type SyncStep = BaseStep & { if?: string; with?: Record<string, unknown> };

export interface WorkflowCheckpoint {
  stepIndex: number;
  stepName: string;
  context: Record<string, unknown>;
  proceedInput: Record<string, unknown>;
}

export interface ExecuteWorkflowSyncInput {
  workflowDefinition: WorkflowYaml;
  payload: Record<string, unknown>;
  maxTimeoutMs: number;
  getStepDefinition: (stepType: string) => ServerStepDefinition | undefined;
  logger: Logger;
  resumeFrom?: WorkflowCheckpoint;
  proceedResult?: Record<string, unknown>;
  /** Workflow saved-object ID — used for event-log context and APM span labels. */
  workflowId?: string;
  /** Human-readable workflow name — used for event-log context. */
  workflowName?: string;
  /**
   * When provided, emits workflow-level and step-level observability events
   * (workflow event log, APM spans) on every sync run. Injected by the engine
   * plugin's start-contract wrapper — callers do not pass this directly.
   */
  workflowEventLoggerService?: IWorkflowEventLoggerService;
}

export interface ExecuteWorkflowSyncResult {
  status: 'completed' | 'failed' | 'suspended';
  output: Record<string, unknown>;
  error?: string;
  checkpoint?: WorkflowCheckpoint;
}

const evaluateCondition = (
  engine: WorkflowTemplatingEngine,
  condition: string,
  context: Record<string, unknown>
): boolean => {
  try {
    return Boolean(engine.evaluateExpression(`{{ ${condition} }}`, context));
  } catch {
    return false;
  }
};

const createNullLogger = (): IWorkflowEventLogger => ({
  logEvent: () => {},
  logInfo: () => {},
  logError: () => {},
  logWarn: () => {},
  logDebug: () => {},
  startTiming: () => {},
  stopTiming: () => {},
  createStepLogger: () => createNullLogger(),
  flushEvents: async () => {},
});

export const executeWorkflowSync = async ({
  workflowDefinition,
  payload,
  maxTimeoutMs,
  getStepDefinition,
  logger,
  resumeFrom,
  proceedResult,
  workflowId,
  workflowName,
  workflowEventLoggerService,
}: ExecuteWorkflowSyncInput): Promise<ExecuteWorkflowSyncResult> => {
  const resolvedWorkflowId = workflowId ?? workflowDefinition.name ?? 'unknown';

  // Defense-in-depth: primary enforcement is at workflow-registration time.
  assertWorkflowLinearForSync(resolvedWorkflowId, workflowDefinition);

  const executionId = `sync_${uuidv4()}`;
  const executionLogger =
    workflowEventLoggerService?.createLogger({
      workflowId: resolvedWorkflowId,
      workflowName: workflowName ?? workflowDefinition.name,
      executionId,
      mode: 'sync',
    }) ?? createNullLogger();

  const apmSpan = agent.startSpan(`workflow.sync.${resolvedWorkflowId}`, 'workflow') ?? undefined;
  apmSpan?.addLabels({
    workflow_id: resolvedWorkflowId,
    execution_id: executionId,
    mode: 'sync',
  });

  const execute = async (): Promise<ExecuteWorkflowSyncResult> => {
    const engine = new WorkflowTemplatingEngine();
    const dispatcher = new StepDispatcher(engine, getStepDefinition, executionId);

    const context: Record<string, unknown> = { event: payload, steps: {} };
    let finalOutput: Record<string, unknown> | undefined;
    let startIndex = 0;

    if (resumeFrom) {
      Object.assign(context, resumeFrom.context);
      (context.steps as Record<string, unknown>)[resumeFrom.stepName] = {
        output: proceedResult ?? {},
      };
      startIndex = resumeFrom.stepIndex;
    }

    executionLogger.logInfo('Workflow execution started', {
      event: { action: 'workflow-start', category: ['workflow'] },
      tags: ['workflow', 'execution', 'start'],
      labels: { execution_id: executionId },
    });

    for (let i = startIndex; i < workflowDefinition.steps.length; i++) {
      const step = workflowDefinition.steps[i];
      const { name: stepName, type: stepType, if: stepIf, with: stepWith } = step as SyncStep;

      const shouldSkip = stepIf ? !evaluateCondition(engine, stepIf, context) : false;

      if (!shouldSkip) {
        if (stepType === 'call_site.proceed') {
          const evaluatedInput = stepWith ? engine.render(stepWith, context) : {};
          executionLogger.logInfo('Workflow suspended at call_site.proceed', {
            event: { action: 'workflow-suspend', category: ['workflow'] },
            tags: ['workflow', 'execution', 'suspend'],
          });
          return {
            status: 'suspended',
            output: payload,
            checkpoint: {
              stepIndex: i + 1,
              stepName,
              context: structuredClone(context),
              proceedInput: evaluatedInput as Record<string, unknown>,
            },
          };
        }

        if (stepType === 'workflow.output') {
          if (stepWith) {
            finalOutput = engine.render(stepWith, context) as Record<string, unknown>;
          }
          break;
        }

        const { output: stepOutput } = await dispatcher.dispatchStep({
          step: { name: stepName, type: stepType, with: stepWith },
          context,
          executionLogger,
        });

        (context.steps as Record<string, unknown>)[stepName] = { output: stepOutput };
      }
    }

    executionLogger.logInfo('Workflow execution completed', {
      event: { action: 'workflow-complete', category: ['workflow'], outcome: 'success' },
      tags: ['workflow', 'execution', 'complete'],
    });

    return {
      status: 'completed',
      output: finalOutput ?? payload,
    };
  };

  const timeoutReject = new Promise<never>((_, reject) =>
    setTimeout(
      () => reject(new Error(`[executeWorkflowSync] Workflow timed out after ${maxTimeoutMs}ms`)),
      maxTimeoutMs
    )
  );

  try {
    const result = await Promise.race([execute(), timeoutReject]);
    apmSpan?.setOutcome('success');
    apmSpan?.end();
    await executionLogger.flushEvents();
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const isTimeout = message.includes('timed out after');

    executionLogger.logError(
      isTimeout
        ? `Workflow execution timed out after ${maxTimeoutMs}ms`
        : `Workflow execution failed: ${message}`,
      err instanceof Error ? err : undefined,
      {
        event: {
          action: isTimeout ? 'workflow-timeout' : 'workflow-failed',
          category: ['workflow'],
          outcome: 'failure',
        },
        tags: ['workflow', 'execution', isTimeout ? 'timeout' : 'fail'],
      }
    );

    apmSpan?.setOutcome('failure');
    apmSpan?.end();
    await executionLogger.flushEvents().catch((flushErr: Error) => {
      logger.warn(`[executeWorkflowSync] Failed to flush event logs: ${flushErr.message}`);
    });

    return { status: 'failed', output: payload, error: message };
  }
};
