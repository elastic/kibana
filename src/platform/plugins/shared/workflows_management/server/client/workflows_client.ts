/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/core/server';
import type { WorkflowsClientProvider } from '@kbn/workflows/server/types';
import { REQUIRED_LICENSE_TYPE } from '../api/constants';
import type { WorkflowsManagementApi } from '../api/workflows_management_api';
import type { WorkflowsService } from '../api/workflows_management_service';

export const createWorkflowsClientProvider = (
  api: WorkflowsManagementApi,
  workflowsService: WorkflowsService,
  logger: Logger
): WorkflowsClientProvider => {
  return async (request) => {
    const { licensing } = await workflowsService.getPluginsStart();
    const license = await licensing.getLicense();
    const isWorkflowsAvailable =
      license.hasAtLeast(REQUIRED_LICENSE_TYPE) && api.isWorkflowsAvailable;

    const executionEngine = await workflowsService.getWorkflowsExecutionEngine();

    return {
      isWorkflowsAvailable,
      emitEvent: async (triggerId, payload) => {
        if (!isWorkflowsAvailable) {
          logger.debug('Workflows is not available in this environment. Trigger event ignored.');
          return;
        }
        try {
          await executionEngine.triggerEvents.emitEvent({ triggerId, payload, request });
        } catch (error) {
          logger.error('Failed to emit event', error);
          throw error;
        }
      },
    };
  };
};
