/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Subscription } from 'rxjs';
import type { Logger } from '@kbn/core/server';
import type { ILicense } from '@kbn/licensing-types';
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
          await workflowsService.installManagedWorkflow(id, options, pluginId, request);
        },
        uninstall: async (pluginId, id, options) => {
          if (!isWorkflowsAvailable) {
            logger.debug(
              'Workflows is not available in this environment. Managed uninstall ignored.'
            );
            return;
          }
          await workflowsService.uninstallManagedWorkflow(id, options, pluginId, request);
        },
        getWorkflowStatus: async (pluginId, id, options) => {
          if (!isWorkflowsAvailable) {
            logger.debug(
              'Workflows is not available in this environment. Managed status rejected.'
            );
            throw new Error('Workflows is not available in this environment');
          }
          return workflowsService.getManagedWorkflowStatus(id, options, pluginId);
        },
        execute: async (pluginId, id, options) => {
          if (!isWorkflowsAvailable) {
            logger.debug(
              'Workflows is not available in this environment. Managed execute rejected.'
            );
            throw new Error('Workflows is not available in this environment');
          }
          return workflowsService.executeManagedWorkflow(id, request, options, pluginId);
        },
      },
    };
  };
};

/**
 * System (requestless) managed-workflows API used by `initManagedWorkflowsClient`.
 *
 * `install` / `ready` are best-effort during Kibana teardown and when Elasticsearch
 * readiness gating skips writes: they may resolve without persisting or without
 * running destructive orphan cleanup. When installs were incomplete, `ready()` still
 * runs dynamic auto upgrades once readiness has passed. See
 * {@link RegisteredManagedWorkflowsLifecycleApi}.
 */
export const createManagedWorkflowsSystemApiProvider = (
  workflowsService: WorkflowsService,
  availabilityTracker: WorkflowsAvailabilityTracker,
  logger: Logger
): ManagedWorkflowsSystemApiProvider => {
  return async (pluginId: string) => {
    const getIsWorkflowsAvailable = await availabilityTracker.getIsWorkflowsAvailable();

    return {
      get isWorkflowsAvailable() {
        return getIsWorkflowsAvailable();
      },
      install: async (id, options) => {
        if (!getIsWorkflowsAvailable()) {
          logger.debug('Workflows is not available in this environment. Managed install ignored.');
          return;
        }
        await workflowsService.installManagedWorkflow(id, options, pluginId);
      },
      uninstall: async (id, options) => {
        if (!getIsWorkflowsAvailable()) {
          logger.debug(
            'Workflows is not available in this environment. Managed uninstall ignored.'
          );
          return;
        }
        await workflowsService.uninstallManagedWorkflow(id, options, pluginId);
      },
      getWorkflowStatus: async (id, options) => {
        if (!getIsWorkflowsAvailable()) {
          logger.debug('Workflows is not available in this environment. Managed status rejected.');
          throw new Error('Workflows is not available in this environment');
        }
        return workflowsService.getManagedWorkflowStatus(id, options, pluginId);
      },
      getInstalledWorkflowState: async (workflowId, spaceId) => {
        if (!getIsWorkflowsAvailable()) {
          logger.debug(
            'Workflows is not available in this environment. Managed state read rejected.'
          );
          throw new Error('Workflows is not available in this environment');
        }
        return workflowsService.getInstalledManagedWorkflowState(workflowId, spaceId, pluginId);
      },
      listInstalledWorkflowStates: async () => {
        if (!getIsWorkflowsAvailable()) {
          logger.debug(
            'Workflows is not available in this environment. Managed state list rejected.'
          );
          throw new Error('Workflows is not available in this environment');
        }
        return workflowsService.listInstalledManagedWorkflowStates(pluginId);
      },
      ready: async () => {
        if (!getIsWorkflowsAvailable()) {
          logger.debug('Workflows is not available in this environment. Managed ready() ignored.');
          return;
        }
        await workflowsService.pluginReady(pluginId);
      },
    };
  };
};

export interface WorkflowsAvailabilityTracker {
  getIsWorkflowsAvailable: () => Promise<() => boolean>;
  stop: () => void;
}

/**
 * Tracks availability with a single `license$` subscription shared by all managed clients, so a
 * client created once stays accurate when the license is upgraded or downgraded.
 */
export const createWorkflowsAvailabilityTracker = (
  workflowsService: WorkflowsService,
  config: WorkflowsManagementConfig
): WorkflowsAvailabilityTracker => {
  let tracking: Promise<() => boolean> | undefined;
  let subscription: Subscription | undefined;
  let stopped = false;

  const track = async (): Promise<() => boolean> => {
    const { licensing } = await workflowsService.getPluginsStart();
    const isAvailable = (license: ILicense) =>
      license.hasAtLeast(REQUIRED_LICENSE_TYPE) && config.available;

    let available = isAvailable(await licensing.getLicense());
    if (!stopped) {
      subscription = licensing.license$.subscribe((license) => {
        available = isAvailable(license);
      });
    }
    return () => available;
  };

  return {
    getIsWorkflowsAvailable: () => {
      tracking ??= track().catch((error) => {
        tracking = undefined;
        throw error;
      });
      return tracking;
    },
    stop: () => {
      stopped = true;
      subscription?.unsubscribe();
      subscription = undefined;
    },
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
