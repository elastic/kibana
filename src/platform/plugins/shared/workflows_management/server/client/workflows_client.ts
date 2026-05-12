/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/core/server';
import type {
  ManagedWorkflowsSystemApiProvider,
  WorkflowsClientProvider,
} from '@kbn/workflows/server/types';
import { REQUIRED_LICENSE_TYPE } from '../api/constants';
import type { WorkflowsService } from '../api/workflows_management_service';
import type { WorkflowsManagementConfig } from '../config';

export const createWorkflowsClientProvider = (
  workflowsService: WorkflowsService,
  config: WorkflowsManagementConfig,
  logger: Logger
): WorkflowsClientProvider => {
  return async (request) => {
    const { isWorkflowsAvailable, workflowsExecutionEngine } =
      await getWorkflowsAvailabilityContext(workflowsService, config);

    return {
      isWorkflowsAvailable,
      emitEvent: async (triggerId, payload) => {
        if (!isWorkflowsAvailable) {
          logger.debug('Workflows is not available in this environment. Trigger event ignored.');
          return;
        }
        return workflowsExecutionEngine.triggerEvents.emitEvent({ triggerId, payload, request });
      },
      managedWorkflows: {
        install: async (pluginId, id, options) => {
          if (!isWorkflowsAvailable) {
            logger.debug(
              'Workflows is not available in this environment. Managed install ignored.'
            );
            return;
          }
          await workflowsService.registerManagedWorkflowPlugin(pluginId);
          await workflowsService.installManagedWorkflow(id, options, pluginId);
        },
        uninstall: async (pluginId, id, options) => {
          if (!isWorkflowsAvailable) {
            logger.debug(
              'Workflows is not available in this environment. Managed uninstall ignored.'
            );
            return;
          }
          await workflowsService.registerManagedWorkflowPlugin(pluginId);
          await workflowsService.uninstallManagedWorkflow(id, options, pluginId);
        },
        execute: async (pluginId, id, options) => {
          if (!isWorkflowsAvailable) {
            logger.debug(
              'Workflows is not available in this environment. Managed execute rejected.'
            );
            throw new Error('Workflows is not available in this environment');
          }
          await workflowsService.registerManagedWorkflowPlugin(pluginId);
          return workflowsService.executeManagedWorkflow(id, request, options, pluginId);
        },
      },
    };
  };
};

export const createManagedWorkflowsSystemApiProvider = (
  workflowsService: WorkflowsService,
  config: WorkflowsManagementConfig,
  logger: Logger
): ManagedWorkflowsSystemApiProvider => {
  return async (pluginId: string) => {
    const { isWorkflowsAvailable } = await getWorkflowsAvailabilityContext(
      workflowsService,
      config
    );

    await workflowsService.registerManagedWorkflowPlugin(pluginId);

    return {
      install: async (id, options) => {
        if (!isWorkflowsAvailable) {
          logger.debug('Workflows is not available in this environment. Managed install ignored.');
          return;
        }
        await workflowsService.installManagedWorkflow(id, options, pluginId);
      },
      uninstall: async (id, options) => {
        if (!isWorkflowsAvailable) {
          logger.debug(
            'Workflows is not available in this environment. Managed uninstall ignored.'
          );
          return;
        }
        await workflowsService.uninstallManagedWorkflow(id, options, pluginId);
      },
      ready: async () => {
        if (!isWorkflowsAvailable) {
          logger.debug('Workflows is not available in this environment. Managed ready() ignored.');
          return;
        }
        await workflowsService.pluginReady(pluginId);
      },
    };
  };
};

const getWorkflowsAvailabilityContext = async (
  workflowsService: WorkflowsService,
  config: WorkflowsManagementConfig
) => {
  const { licensing, workflowsExecutionEngine } = await workflowsService.getPluginsStart();
  const license = await licensing.getLicense();

  // License check for stateful and availability check for serverless
  const isWorkflowsAvailable = license.hasAtLeast(REQUIRED_LICENSE_TYPE) && config.available;

  return {
    isWorkflowsAvailable,
    workflowsExecutionEngine,
  };
};
