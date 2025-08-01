/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';

import { AlertingConnectorFeatureId } from '@kbn/actions-plugin/common/connector_feature_config';
import type {
  ActionType as ConnectorType,
  ActionTypeExecutorOptions as ConnectorTypeExecutorOptions,
  ActionTypeExecutorResult as ConnectorTypeExecutorResult,
} from '@kbn/actions-plugin/server/types';

export function getWorkflowConnectorType(): ConnectorType<{}, {}, {}> {
  return {
    id: 'workflow',
    name: 'Workflow',
    isSystemActionType: true,
    minimumLicenseRequired: 'enterprise' as const,
    supportedFeatureIds: [AlertingConnectorFeatureId],
    validate: {
      config: {
        schema: schema.any(),
      },
      secrets: {
        schema: schema.any(),
      },
      params: {
        schema: schema.any(),
      },
    },
    executor: async (
      options: ConnectorTypeExecutorOptions<{}, {}, {}>
    ): Promise<ConnectorTypeExecutorResult<void>> => {
      const { actionId, params, logger, request } = options;

      logger.info(
        `Running workflow connector with the following params ${JSON.stringify(params, null, 2)}`
      );

      // Queue something on behalf of the user
      // taskManager.schedule({ id: 'foo', taskType: 'foo', params: {}, state: {} }, { request });

      // Queue an action on behalf of the user
      // const actionsClient = await plugins.actions.getActionsClientWithRequest(request)
      // await actionsClient.execute({ id, params, spaceId });

      return { status: 'ok', actionId };
    },
  };
}
