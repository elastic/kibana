/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IContextProvider, Logger } from '@kbn/core/server';
import { REQUIRED_LICENSE_TYPE } from './constants';
import type { WorkflowsManagementApi } from './workflows_management_api';
import type { WorkflowsService } from './workflows_management_service';
import { createTriggerEventHandler } from '../event_driven/trigger_event_handler';
import type { WorkflowsRequestHandlerContext } from '../types';

export const createWorkflowsRouteHandlerContextProvider = (
  api: WorkflowsManagementApi,
  workflowsService: WorkflowsService,
  logger: Logger
): IContextProvider<WorkflowsRequestHandlerContext, 'workflows'> => {
  const triggerEventHandler = createTriggerEventHandler({ logger, api, workflowsService });

  return async (context, request) => {
    const workflowsExtensions = await workflowsService.getWorkflowsExtensions();
    const { license } = await context.licensing;

    // license for stateful and config.available for serverless
    const isWorkflowsAvailable =
      license.hasAtLeast(REQUIRED_LICENSE_TYPE) && api.isWorkflowsAvailable;

    return {
      isWorkflowsAvailable,
      getWorkflowsClient: () => {
        if (isWorkflowsAvailable) {
          return {
            emitEvent: workflowsExtensions.getEventEmitter(request, triggerEventHandler),
          };
        }
        return {
          emitEvent: async (triggerId) => {
            logger.warn(
              `Workflows event '${triggerId}' ignored: workflows is not available in this environment.`
            );
          },
        };
      },
    };
  };
};
