/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionTypeExecutorResult } from '@kbn/actions-plugin/common';
import { getConnectorSpec } from '@kbn/connector-specs';
import { SystemConnectorsMap } from '@kbn/workflows/common/constants';
import { ExecutionError } from '@kbn/workflows/server';
import { ActionsResponseContentLengthLimitError } from './actions_response_content_length_limit_error';
import { ResponseSizeLimitError } from './errors';
import type { BaseStep, RunStepResult } from './node_implementation';
import { BaseAtomicNodeImplementation } from './node_implementation';
import type { ConnectorExecutor } from '../connector_executor';
import type { StepExecutionRuntime } from '../workflow_context_manager/step_execution_runtime';
import type { WorkflowExecutionRuntimeManager } from '../workflow_context_manager/workflow_execution_runtime_manager';
import type { IWorkflowEventLogger } from '../workflow_event_logger';

/**
 * Connector step types that support Layer 1 (mid-stream) response size enforcement
 * via fetchOptions.max_content_length. All other connector types get Layer 2 only
 * (output size check in base class after the response is in memory).
 * When adding Layer 1 for a new connector type (e.g. one that can return large payloads),
 * add it here and implement the limit in that connector's Actions executor.
 */
const CONNECTOR_TYPES_WITH_LAYER_1 = new Set<string>(['http']);

// Axios internal error message format — no typed error code is exposed for this case,
// so regex matching is the only reliable detection method.
const ACTIONS_MAX_CONTENT_LENGTH_ERROR_PATTERN = /maxContentLength size of (\d+) exceeded/;

const getActionsMaxContentLengthLimit = (errorMessage: string): number | undefined => {
  const match = errorMessage.match(ACTIONS_MAX_CONTENT_LENGTH_ERROR_PATTERN);
  if (!match) {
    return undefined;
  }
  return Number(match[1]);
};

const getContentLengthBytes = (
  errorMeta: Record<string, unknown> | undefined
): number | undefined => {
  const contentLengthBytes = errorMeta?.contentLengthBytes;
  return typeof contentLengthBytes === 'number' ? contentLengthBytes : undefined;
};

const getEstimatedOutputBytes = (
  errorMeta: Record<string, unknown> | undefined
): number | undefined => {
  const estimatedOutputBytes = errorMeta?.estimatedOutputBytes;
  return typeof estimatedOutputBytes === 'number' ? estimatedOutputBytes : undefined;
};

const isSpecConnectorType = (connectorType: string): boolean =>
  getConnectorSpec(`.${connectorType}`) !== undefined;

const shouldUseWorkflowTransportLimit = ({
  rawType,
  stepType,
  hasStepMaxSize,
}: {
  rawType: string;
  stepType: string;
  hasStepMaxSize: boolean;
}): boolean => {
  if (CONNECTOR_TYPES_WITH_LAYER_1.has(rawType)) {
    return true;
  }

  return hasStepMaxSize && isSpecConnectorType(stepType);
};

// Extend BaseStep for connector-specific properties
export interface ConnectorStep extends BaseStep {
  'connector-id'?: string;
  with?: Record<string, unknown>;
}

export class ConnectorStepImpl extends BaseAtomicNodeImplementation<ConnectorStep> {
  constructor(
    step: ConnectorStep,
    stepExecutionRuntime: StepExecutionRuntime,
    connectorExecutor: ConnectorExecutor,
    workflowState: WorkflowExecutionRuntimeManager,
    private workflowLogger: IWorkflowEventLogger
  ) {
    super(step, stepExecutionRuntime, connectorExecutor, workflowState);
  }

  public getInput() {
    return this.stepExecutionRuntime.contextManager.renderValueAccordingToContext(
      this.step.with || {}
    );
  }

  public async _run(withInputs: Record<string, unknown>): Promise<RunStepResult> {
    try {
      const step = this.step;

      // Parse step type and determine if it's a sub-action
      const [stepType, subActionName] = step.type.includes('.')
        ? step.type.split('.', 2)
        : [step.type, null];
      const isSubAction = subActionName !== null;

      // TODO: remove this once we have a proper connector executor/step for console
      if (step.type === 'console') {
        const consoleMessage = withInputs?.message ?? '';

        this.workflowLogger.logInfo(`Log from step ${step.name}: \n${consoleMessage}`, {
          workflow: { step_id: step.name },
          event: { action: 'log', outcome: 'success' },
          tags: ['console', 'log'],
        });
        return {
          input: withInputs,
          output: consoleMessage,
          error: undefined,
        };
      }

      // Build final rendered inputs
      let renderedInputs = isSubAction
        ? {
            subActionParams: withInputs,
            subAction: subActionName,
          }
        : withInputs;

      // For connector types with Layer 1 support, inject max_content_length
      // so axios can abort mid-stream (Layer 1 OOM prevention).
      // The HTTP system connector uses "fetcher"; spec-based connectors use "fetchOptions".
      const rawType = step.type;
      const isSpecConnector = isSpecConnectorType(stepType);
      const hasStepMaxSize = Boolean(step['max-step-size']);
      const usesWorkflowTransportLimit = shouldUseWorkflowTransportLimit({
        rawType,
        stepType,
        hasStepMaxSize,
      });
      if (usesWorkflowTransportLimit) {
        const maxBytes = this.getMaxResponseBytes();
        if (maxBytes > 0) {
          const fetchKey = CONNECTOR_TYPES_WITH_LAYER_1.has(rawType) ? 'fetcher' : 'fetchOptions';
          renderedInputs = {
            ...renderedInputs,
            [fetchKey]: {
              ...(renderedInputs?.[fetchKey] || {}),
              max_content_length: maxBytes,
            },
          };
        }
      }

      const connectorIdRendered =
        this.stepExecutionRuntime.contextManager.renderValueAccordingToContext(
          step['connector-id']
        );

      if (!this.connectorExecutor) {
        throw new ExecutionError({
          type: 'ConnectorExecutionError',
          message: 'Connector executor is not set',
        });
      }

      let output: ActionTypeExecutorResult<unknown>;
      if (connectorIdRendered) {
        // Use regular connector with saved object
        output = await this.connectorExecutor.execute({
          connectorType: stepType,
          connectorNameOrId: connectorIdRendered,
          input: renderedInputs || {},
          abortController: this.stepExecutionRuntime.abortController,
        });
      } else {
        const systemConnectorActionTypeId = SystemConnectorsMap.get(`.${stepType}`);
        if (systemConnectorActionTypeId) {
          output = await this.connectorExecutor.executeSystemConnector({
            connectorType: systemConnectorActionTypeId,
            input: renderedInputs || {},
            abortController: this.stepExecutionRuntime.abortController,
          });
        } else {
          throw new Error(`Connector ID is required for connector type ${stepType}`);
        }
      }

      const { data, status, message, serviceMessage, errorMeta } = output;

      if (status === 'ok') {
        return {
          input: withInputs,
          output: data,
          error: undefined,
        };
      } else {
        // A bare connector error (no message) would otherwise surface as an
        // opaque 'Unknown error' in the failed-workflow event.
        const errorMsg =
          serviceMessage ??
          message ??
          `Connector '${step.name}' (${stepType}) failed with status '${status}'`;

        if (errorMsg.includes('maxContentLength')) {
          if (!usesWorkflowTransportLimit) {
            const limitBytes = getActionsMaxContentLengthLimit(errorMsg);
            return {
              input: withInputs,
              output: undefined,
              error: new ActionsResponseContentLengthLimitError(step.name, {
                limitBytes,
                contentLengthBytes: getContentLengthBytes(errorMeta),
                estimatedOutputBytes: getEstimatedOutputBytes(errorMeta),
                canOverrideWithMaxStepSize: isSpecConnector,
              }),
            };
          }

          const limitBytes = this.getMaxResponseBytes();
          return {
            input: withInputs,
            output: undefined,
            error: new ResponseSizeLimitError(limitBytes, step.name, {
              contentLengthBytes: getContentLengthBytes(errorMeta),
              estimatedOutputBytes: getEstimatedOutputBytes(errorMeta),
            }),
          };
        }

        return {
          input: withInputs,
          output: undefined,
          error: new ExecutionError({
            type: 'ConnectorExecutionError',
            message: errorMsg,
          }),
        };
      }
    } catch (error) {
      return this.handleFailure(withInputs, error);
    }
  }
}
