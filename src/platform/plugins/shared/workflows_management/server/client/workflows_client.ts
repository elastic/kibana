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
import type { WorkflowsClientProvider } from '@kbn/workflows/server/types';
import { REQUIRED_LICENSE_TYPE } from '../api/constants';
import type { WorkflowsService } from '../api/workflows_management_service';
import type { WorkflowsManagementConfig } from '../config';

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
        const hasEnabledWorkflows = subscribedWorkflows.some((w) => w.enabled);
        if (!hasEnabledWorkflows) {
          logger.debug(
            `No enabled workflows for trigger "${triggerId}" in space "${spaceId}". Hook invocation is a pass-through.`
          );
          return { status: 'pass_through', output: payload };
        }

        return workflowsExtensions.invokeHook(triggerId, payload, capabilities);
      },
    };
  };
};
