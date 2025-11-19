/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { AlertingConnectorFeatureId, SecurityConnectorFeatureId } from '@kbn/actions-plugin/common';
import type {
  ActionType as ConnectorType,
  ActionTypeExecutorOptions as ConnectorTypeExecutorOptions,
  ActionTypeExecutorResult as ConnectorTypeExecutorResult,
} from '@kbn/actions-plugin/server/types';
import type { ConnectorAdapter } from '@kbn/alerting-plugin/server';
import type { KibanaRequest } from '@kbn/core/server';
import { z } from '@kbn/zod/v4';
import { api } from './api';
import { ExecutorParamsSchema, WorkflowsRuleActionParamsSchema } from './schema';
import { createExternalService, type WorkflowsServiceFunction } from './service';
import * as i18n from './translations';
import type {
  ExecutorParams,
  ExecutorSubActionRunParams,
  WorkflowsActionParamsType,
  WorkflowsExecutorResultData,
} from './types';
import { buildAlertEvent } from '../../../common/utils/build_alert_event';

const supportedSubActions: string[] = ['run'];
export type ActionParamsType = WorkflowsActionParamsType;
export const ConnectorTypeId = '.workflows';

export interface WorkflowsRuleActionParams {
  subAction: 'run';
  subActionParams: {
    workflowId: string;
  };
  [key: string]: unknown;
}

// Interface for dependency injection, similar to GetCasesConnectorTypeArgs
export interface GetWorkflowsConnectorTypeArgs {
  getWorkflowsService?: (request: KibanaRequest) => Promise<WorkflowsServiceFunction>;
}

// connector type definition
export function getConnectorType(
  deps?: GetWorkflowsConnectorTypeArgs
): ConnectorType<
  Record<string, unknown>,
  Record<string, unknown>,
  ExecutorParams,
  WorkflowsExecutorResultData
> {
  return {
    id: ConnectorTypeId,
    minimumLicenseRequired: 'gold',
    name: i18n.NAME,
    validate: {
      params: {
        schema: ExecutorParamsSchema,
      },
      config: {
        schema: z.object({}).strict(),
      },
      secrets: {
        schema: z.object({}).strict(),
      },
    },
    executor: (execOptions) => executor(execOptions, deps),
    supportedFeatureIds: [AlertingConnectorFeatureId, SecurityConnectorFeatureId],
    isSystemActionType: true,
  };
}

// action executor
export async function executor(
  execOptions: ConnectorTypeExecutorOptions<
    Record<string, unknown>,
    Record<string, unknown>,
    WorkflowsActionParamsType
  >,
  deps?: GetWorkflowsConnectorTypeArgs
): Promise<ConnectorTypeExecutorResult<WorkflowsExecutorResultData>> {
  const { actionId, configurationUtilities, params, logger, connectorUsageCollector, request } =
    execOptions;

  const { subAction, subActionParams } = params;

  let data: WorkflowsExecutorResultData | undefined;

  // Get the workflows service function if available
  let workflowsServiceFunction: WorkflowsServiceFunction | undefined;
  if (deps?.getWorkflowsService && request) {
    try {
      workflowsServiceFunction = await deps.getWorkflowsService(request as KibanaRequest);
    } catch (error) {
      logger.error(`Failed to get workflows service: ${error.message}`);
    }
  }

  const externalService = createExternalService(
    actionId,
    logger,
    configurationUtilities,
    connectorUsageCollector,
    request as KibanaRequest,
    workflowsServiceFunction
  );

  if (!api[subAction]) {
    const errorMessage = `[WorkflowsConnector][Action][ExternalService] Unsupported subAction type ${subAction}.`;
    logger.error(errorMessage);
    throw new Error(errorMessage);
  }

  if (!supportedSubActions.includes(subAction)) {
    const errorMessage = `[WorkflowsConnector][Action][ExternalService] subAction ${subAction} not implemented.`;
    logger.error(errorMessage);
    throw new Error(errorMessage);
  }

  if (subAction === 'run') {
    const runParams = subActionParams as ExecutorSubActionRunParams;
    data = await api.run({
      externalService,
      params: runParams,
      logger,
    });

    logger.debug(`response run workflow for workflow id: ${data.workflowRunId}`);
  }

  return { status: 'ok', data, actionId };
}

// Connector adapter for system action
export function getWorkflowsConnectorAdapter(): ConnectorAdapter<
  WorkflowsRuleActionParams,
  ExecutorParams
> {
  return {
    connectorTypeId: ConnectorTypeId,
    ruleActionParamsSchema: WorkflowsRuleActionParamsSchema,
    buildActionParams: ({ alerts, rule, params, ruleUrl, spaceId }) => {
      try {
        const subActionParams = params?.subActionParams;
        if (!subActionParams) {
          throw new Error(`Missing subActionParams. Received: ${JSON.stringify(params)}`);
        }

        const { workflowId } = subActionParams;
        if (!workflowId) {
          throw new Error(
            `Missing required workflowId parameter. Received params: ${JSON.stringify(params)}`
          );
        }

        // Build alert event using shared utility function
        const alertEvent = buildAlertEvent({
          alerts,
          rule,
          ruleUrl,
          spaceId,
        });

        return {
          subAction: 'run' as const,
          subActionParams: {
            workflowId,
            inputs: { event: alertEvent },
            spaceId,
          },
        };
      } catch (error) {
        return {
          subAction: 'run' as const,
          subActionParams: {
            workflowId: params?.subActionParams?.workflowId || 'unknown',
            spaceId,
          },
        };
      }
    },
  };
}
