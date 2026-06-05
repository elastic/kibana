/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/core/server';
import type { SpacesServiceSetup } from '@kbn/spaces-plugin/server';
import type { WorkflowDetailDto } from '@kbn/workflows';
import type { WorkflowsClientProvider } from '@kbn/workflows/server/types';
import { REQUIRED_LICENSE_TYPE } from '../api/constants';
import type { WorkflowsService } from '../api/workflows_management_service';
import type { WorkflowsManagementConfig } from '../config';

const parseTimeoutMs = (timeout: string): number => {
  const match = timeout.match(/^(\d+)(ms|s|m)$/);
  if (!match)
    throw new Error(`Invalid maxTimeout format: "${timeout}". Expected e.g. '15s', '500ms', '2m'.`);
  const value = parseInt(match[1], 10);
  if (match[2] === 'ms') return value;
  if (match[2] === 's') return value * 1_000;
  return value * 60_000;
};

export const createWorkflowsClientProvider = (
  workflowsService: WorkflowsService,
  config: WorkflowsManagementConfig,
  logger: Logger,
  spaces: SpacesServiceSetup
): WorkflowsClientProvider => {
  return async (request) => {
    const { licensing, workflowsExtensions } = await workflowsService.getPluginsStart();
    const license = await licensing.getLicense();

    // License check for stateful and availability check for serverless
    const isWorkflowsAvailable = license.hasAtLeast(REQUIRED_LICENSE_TYPE) && config.available;

    return {
      isWorkflowsAvailable,
      emitEvent: async (triggerId, payload) => {
        if (!isWorkflowsAvailable) {
          logger.debug('Workflows is not available in this environment. Trigger event ignored.');
          return;
        }
        const { workflowsExecutionEngine } = await workflowsService.getPluginsStart();
        return workflowsExecutionEngine.triggerEvents.emitEvent({ triggerId, payload, request });
      },
      invokeHook: async (triggerId, payload, capabilities) => {
        if (!isWorkflowsAvailable) {
          logger.debug(
            'Workflows is not available in this environment. Hook invocation is a pass-through.'
          );
          return { status: 'pass_through', output: payload };
        }

        const spaceId = spaces.getSpaceId(request);
        const subscribedWorkflows = await workflowsService.getWorkflowsSubscribedToTrigger(
          triggerId,
          spaceId
        );

        type WorkflowWithDefinition = WorkflowDetailDto & {
          definition: NonNullable<WorkflowDetailDto['definition']>;
        };

        const hasAnyEnabledWorkflows = subscribedWorkflows.some((w) => w.enabled);
        if (!hasAnyEnabledWorkflows) {
          logger.debug(`No enabled workflows for trigger "${triggerId}".`);
          return { status: 'pass_through', output: payload };
        }

        const enabledWorkflows = subscribedWorkflows.filter(
          (w): w is WorkflowWithDefinition => w.enabled && w.definition != null
        );

        if (!enabledWorkflows.length) {
          logger.debug(
            `Trigger "${triggerId}" has enabled workflows but no YAML definitions. Delegating to in-memory handlers.`
          );
          return workflowsExtensions.invokeHook(triggerId, payload, capabilities);
        }

        const triggerDef = workflowsExtensions.getTriggerDefinition(triggerId);

        if (!triggerDef?.sync?.inlineExecution) {
          logger.debug(
            `Trigger "${triggerId}" does not opt in to inline execution. Delegating to in-memory handlers.`
          );
          return workflowsExtensions.invokeHook(triggerId, payload, capabilities);
        }

        const { chained, failurePolicy, maxTimeout } = triggerDef.sync;
        const timeoutMs = parseTimeoutMs(maxTimeout);

        const { workflowsExecutionEngine } = await workflowsService.getPluginsStart();

        // around-hook: proceed function is passed as a capability by the inference plugin.
        const proceedFn = capabilities?.proceedFn as
          | ((input: Record<string, unknown>) => Promise<Record<string, unknown>>)
          | undefined;

        let current = payload;
        for (const workflow of enabledWorkflows) {
          const firstResult = await workflowsExecutionEngine.executeWorkflowSync({
            workflowDefinition: workflow.definition,
            payload: current,
            maxTimeoutMs: timeoutMs,
            workflowId: workflow.id,
            workflowName: workflow.name,
          });

          if (firstResult.status === 'failed') {
            if (failurePolicy === 'closed') {
              return { status: 'failed', output: current, error: firstResult.error };
            }
            logger.warn(
              `[invokeHook] workflow "${workflow.name}" failed (open policy): ${firstResult.error}`
            );
          } else if (firstResult.status === 'suspended') {
            if (!firstResult.checkpoint) {
              return {
                status: 'failed',
                output: current,
                error: 'suspended result missing checkpoint',
              };
            }
            if (!proceedFn) {
              return {
                status: 'failed',
                output: current,
                error:
                  '[invokeHook] around-hook workflow suspended but no proceedFn capability provided',
              };
            }

            let proceedResult: Record<string, unknown> | undefined;
            try {
              proceedResult = await proceedFn(firstResult.checkpoint.proceedInput);
            } catch (err) {
              const message = err instanceof Error ? err.message : String(err);
              if (failurePolicy === 'closed') {
                return {
                  status: 'failed',
                  output: current,
                  error: `[invokeHook] proceed function failed: ${message}`,
                };
              }
              logger.warn(`[invokeHook] proceed function failed (open policy): ${message}`);
            }

            if (proceedResult !== undefined) {
              const resumeResult = await workflowsExecutionEngine.executeWorkflowSync({
                workflowDefinition: workflow.definition,
                payload: current,
                maxTimeoutMs: timeoutMs,
                resumeFrom: firstResult.checkpoint,
                proceedResult,
                workflowId: workflow.id,
                workflowName: workflow.name,
              });

              if (resumeResult.status === 'failed') {
                if (failurePolicy === 'closed') {
                  return { status: 'failed', output: current, error: resumeResult.error };
                }
                logger.warn(
                  `[invokeHook] workflow "${workflow.name}" resume failed (open policy): ${resumeResult.error}`
                );
              } else {
                current = resumeResult.output;
              }
            }
          } else if (chained) {
            current = firstResult.output;
          }
        }
        return { status: 'completed', output: current };
      },
    };
  };
};
