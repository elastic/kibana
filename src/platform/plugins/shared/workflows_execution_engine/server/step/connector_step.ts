/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// TODO: Remove eslint exceptions comments and fix the issues
/* eslint-disable @typescript-eslint/no-explicit-any */

import type { ActionTypeExecutorResult } from '@kbn/actions-plugin/common';
import { SystemConnectorsMap } from '@kbn/workflows/common/constants';
import { ExecutionError } from '@kbn/workflows/server';
import type { BaseStep, RunStepResult } from './node_implementation';
import { BaseAtomicNodeImplementation } from './node_implementation';
import { ResponseSizeLimitError, formatBytes } from './errors';
import type { ConnectorExecutor } from '../connector_executor';
import type { StepExecutionRuntime } from '../workflow_context_manager/step_execution_runtime';
import type { WorkflowExecutionRuntimeManager } from '../workflow_context_manager/workflow_execution_runtime_manager';
import type { IWorkflowEventLogger } from '../workflow_event_logger';

/**
 * Connector step types that support Layer 1 (mid-stream) response size enforcement
 * via fetcher.max_content_length. All other connector types get Layer 2 only
 * (output size check in base class after the response is in memory).
 * When adding Layer 1 for a new connector type (e.g. one that can return large payloads),
 * add it here and implement the limit in that connector's Actions executor.
 */
const CONNECTOR_TYPES_WITH_LAYER_1 = new Set<string>(['http', '.webhook']);

// Extend BaseStep for connector-specific properties
export interface ConnectorStep extends BaseStep {
  'connector-id'?: string;
  with?: Record<string, any>;
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

  public async _run(withInputs?: any): Promise<RunStepResult> {
    try {
      const step = this.step;

      // Parse step type and determine if it's a sub-action
      const [stepType, subActionName] = step.type.includes('.')
        ? step.type.split('.', 2)
        : [step.type, null];
      const isSubAction = subActionName !== null;

      // TODO: remove this once we have a proper connector executor/step for console
      if (step.type === 'console') {
        this.workflowLogger.logInfo(`Log from step ${step.name}: \n${withInputs.message}`, {
          workflow: { step_id: step.name },
          event: { action: 'log', outcome: 'success' },
          tags: ['console', 'log'],
        });
        return {
          input: withInputs,
          output: withInputs.message,
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

      // For connector types with Layer 1 support, inject max_content_length into the fetcher config
      // so axios can abort mid-stream (Layer 1 OOM prevention).
      const rawType = step.type;
      if (CONNECTOR_TYPES_WITH_LAYER_1.has(rawType)) {
        const maxBytes = this.getMaxResponseSize();
        if (maxBytes > 0) {
          renderedInputs = {
            ...renderedInputs,
            fetcher: {
              ...(renderedInputs.fetcher || {}),
              max_content_length: maxBytes,
            },
          };
        }
      }

      const connectorIdRendered =
        this.stepExecutionRuntime.contextManager.renderValueAccordingToContext(
          step['connector-id']
        );

      let output: ActionTypeExecutorResult<unknown>;
      if (connectorIdRendered) {
        // Use regular connector with saved object
        output = await this.connectorExecutor.execute({
          connectorType: stepType,
          connectorNameOrId: connectorIdRendered,
          input: renderedInputs,
          abortController: this.stepExecutionRuntime.abortController,
        });
      } else {
        const systemConnectorActionTypeId = SystemConnectorsMap.get(`.${stepType}`);
        if (systemConnectorActionTypeId) {
          output = await this.connectorExecutor.executeSystemConnector({
            connectorType: systemConnectorActionTypeId,
            input: renderedInputs,
            abortController: this.stepExecutionRuntime.abortController,
          });
        } else {
          throw new Error(`Connector ID is required for connector type ${stepType}`);
        }
      }

      const { data, status, message, serviceMessage } = output;

      if (status === 'ok') {
        return {
          input: withInputs,
          output: data,
          error: undefined,
        };
      } else {
        const errorMsg = serviceMessage ?? message ?? 'Unknown error';

        // Detect maxContentLength exceeded from HTTP connectors and enrich the error
        if (errorMsg.includes('maxContentLength')) {
          const stepName =
            step.name || (step as any).configuration?.name || (step as any).stepId;
          const limitBytes = this.getMaxResponseSize();
          const sizeLimitError = new ResponseSizeLimitError(-1, limitBytes, stepName);

          // Best-effort: do a HEAD request to get the actual content-length
          try {
            const url = withInputs?.url || renderedInputs?.url;
            if (url) {
              const headResponse = await fetch(url, { method: 'HEAD' });
              const contentLength = headResponse.headers.get('content-length');
              const contentEncoding = headResponse.headers.get('content-encoding');
              const isCompressed = !!contentEncoding && contentEncoding !== 'identity';

              if (contentLength && sizeLimitError.details) {
                const rawSize = parseInt(contentLength, 10);

                if (isCompressed) {
                  sizeLimitError.details._debug = {
                    url,
                    compressedSize: rawSize,
                    compressedSizeFormatted: formatBytes(rawSize),
                    contentEncoding,
                    suggestion:
                      `The remote resource is ${formatBytes(rawSize)} compressed (${contentEncoding}). ` +
                      `The decompressed size is larger and exceeded the ${formatBytes(limitBytes)} limit. ` +
                      `Increase max-step-size until the request succeeds.`,
                  };
                } else {
                  sizeLimitError.details._debug = {
                    url,
                    actualContentLength: rawSize,
                    actualContentLengthFormatted: formatBytes(rawSize),
                    suggestedLimit: formatBytes(Math.ceil(rawSize * 1.1)),
                    suggestion:
                      `The remote resource is ${formatBytes(rawSize)}. ` +
                      `Set max-step-size to at least ${formatBytes(Math.ceil(rawSize * 1.1))} to allow this request.`,
                  };
                }
              }
            }
          } catch {
            // HEAD request failed -- still return the size limit error without debug info
          }

          return { input: withInputs, output: undefined, error: sizeLimitError };
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
