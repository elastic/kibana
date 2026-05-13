/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/logging';
import type { BaseStep, WorkflowYaml } from '@kbn/workflows';
import type { ServerStepDefinition } from '@kbn/workflows-extensions/server';
import { WorkflowTemplatingEngine } from '../templating_engine';

// BaseStep only carries name/type. Real steps also have if/with — extend here for inline execution.
type SyncStep = BaseStep & { if?: string; with?: Record<string, unknown> };

export interface ExecuteWorkflowSyncInput {
  workflowDefinition: WorkflowYaml;
  payload: Record<string, unknown>;
  maxTimeoutMs: number;
  getStepDefinition: (stepType: string) => ServerStepDefinition | undefined;
  logger: Logger;
}

export interface ExecuteWorkflowSyncResult {
  status: 'completed' | 'failed';
  output: Record<string, unknown>;
  error?: string;
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

export const executeWorkflowSync = async ({
  workflowDefinition,
  payload,
  maxTimeoutMs,
  getStepDefinition,
  logger,
}: ExecuteWorkflowSyncInput): Promise<ExecuteWorkflowSyncResult> => {
  const execute = async (): Promise<ExecuteWorkflowSyncResult> => {
    const engine = new WorkflowTemplatingEngine();
    const context: Record<string, unknown> = {
      event: payload,
      steps: {},
    };

    let finalOutput: Record<string, unknown> | undefined;

    for (const step of workflowDefinition.steps) {
      const { name: stepName, type: stepType, if: stepIf, with: stepWith } = step as SyncStep;

      const shouldSkip = stepIf ? !evaluateCondition(engine, stepIf, context) : false;

      if (!shouldSkip) {
        if (stepType === 'workflow.output') {
          if (stepWith) {
            finalOutput = engine.render(stepWith, context) as Record<string, unknown>;
          }
          break;
        }

        const stepDef = getStepDefinition(stepType);
        if (!stepDef) {
          throw new Error(`[executeWorkflowSync] No step definition found for type "${stepType}"`);
        }

        const evaluatedInput = stepWith ? engine.render(stepWith, context) : {};

        const abortController = new AbortController();
        const handlerContext = {
          input: evaluatedInput,
          rawInput: stepWith ?? {},
          config: {},
          contextManager: {
            getContext: () => ({ event: payload, steps: {} }),
            getScopedEsClient: () => {
              throw new Error('[executeWorkflowSync] getScopedEsClient is not available');
            },
            renderInputTemplate: <T>(value: T) => engine.render(value, context),
            getFakeRequest: () => {
              throw new Error('[executeWorkflowSync] getFakeRequest is not available');
            },
          },
          logger: {
            debug: (msg: string, meta?: object) => logger.debug(msg, meta),
            info: (msg: string, meta?: object) => logger.info(msg, meta),
            warn: (msg: string, meta?: object) => logger.warn(msg, meta),
            error: (msg: string, error?: Error) => logger.error(msg, error ? { error } : undefined),
          },
          abortSignal: abortController.signal,
          stepId: stepName,
          stepType,
        };

        const result = await stepDef.handler(handlerContext as never);
        const stepOutput = result.output ?? {};

        const stepsContext = context.steps as Record<string, unknown>;
        stepsContext[stepName] = { output: stepOutput };
      }
    }

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
    return await Promise.race([execute(), timeoutReject]);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { status: 'failed', output: payload, error: message };
  }
};
