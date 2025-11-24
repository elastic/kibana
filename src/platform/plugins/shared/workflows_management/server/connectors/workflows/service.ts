/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionsConfigurationUtilities } from '@kbn/actions-plugin/server/actions_config';

import type { ConnectorUsageCollector } from '@kbn/actions-plugin/server/types';
import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { ExternalService, RunWorkflowParams, WorkflowExecutionResponse } from './types';
import { createServiceError } from './utils';

// Type for the workflows service function that should be injected
export type WorkflowsServiceFunction = (
  workflowId: string,
  spaceId: string,
  inputs: Record<string, unknown>,
  request: KibanaRequest
) => Promise<string>;

export const createExternalService = (
  _actionId: string,
  logger: Logger,
  _configurationUtilities: ActionsConfigurationUtilities,
  _connectorUsageCollector: ConnectorUsageCollector,
  request: KibanaRequest,
  // This should be injected like getCasesClient in the cases connector
  runWorkflowService?: WorkflowsServiceFunction
): ExternalService => {
  const runWorkflow = async ({
    workflowId,
    spaceId,
    inputs,
  }: RunWorkflowParams): Promise<WorkflowExecutionResponse> => {
    try {
      logger.info(`Attempting to run workflow ${workflowId} via internal service`);

      if (!runWorkflowService) {
        throw new Error(
          'Workflows service not available. This connector requires workflows management plugin to be enabled.'
        );
      }

      // Use the injected service function instead of making HTTP requests
      const workflowRunId = await runWorkflowService(workflowId, spaceId, inputs, request);

      if (!workflowRunId) {
        throw new Error('Invalid response: missing workflowRunId');
      }

      logger.info(`Successfully started workflow ${workflowId}, run ID: ${workflowRunId}`);

      return {
        workflowRunId,
        status: 'executed',
      };
    } catch (error) {
      logger.error(`Error running workflow ${workflowId}: ${error.message}`);
      throw createServiceError(error, `Unable to run workflow ${workflowId}`);
    }
  };

  return {
    runWorkflow,
  };
};
