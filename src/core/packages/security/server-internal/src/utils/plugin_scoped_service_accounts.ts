/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  CoreServiceAccountsService,
  ServiceAccountsServiceContract,
  ServiceAccountWorkloadRef,
} from '@kbn/core-security-server';
import { SERVICE_ACCOUNT_WORKLOAD_ID_MAX_LENGTH } from '@kbn/core-security-server';
import type { WorkloadTypeRegistry } from '../workload_type_registry';

export interface PluginScopedServiceAccountsOptions {
  pluginId: string;
  delegate: ServiceAccountsServiceContract;
  workloadTypes: WorkloadTypeRegistry;
}

/**
 * Builds the service accounts contract one plugin receives at start. The workload methods refuse
 * any workload type the plugin did not register and any malformed workload ID, and otherwise call
 * the delegate with the plugin's id, which the plugin itself never supplies.
 */
export const createPluginScopedServiceAccounts = ({
  pluginId,
  delegate,
  workloadTypes,
}: PluginScopedServiceAccountsOptions): CoreServiceAccountsService => {
  const ensureRegistered = (workloadType: string): void => {
    if (!workloadTypes.isRegistered(pluginId, workloadType)) {
      throw new Error(
        `Plugin [${pluginId}] has not registered service account workload type [${workloadType}]. Register it with core.security.serviceAccounts.registerWorkloadType() during setup.`
      );
    }
  };

  const ensureWellFormedWorkloadId = (workloadId: string): void => {
    if (typeof workloadId !== 'string' || workloadId.length === 0) {
      throw new Error(
        `Plugin [${pluginId}] supplied an empty service account workload ID; workload IDs must be non-empty strings.`
      );
    }

    if (workloadId.length > SERVICE_ACCOUNT_WORKLOAD_ID_MAX_LENGTH) {
      throw new Error(
        `Plugin [${pluginId}] supplied a service account workload ID that is too long: it must be at most ${SERVICE_ACCOUNT_WORKLOAD_ID_MAX_LENGTH} characters, but got ${workloadId.length}.`
      );
    }
  };

  const ensureValid = ({ workloadType, workloadId }: ServiceAccountWorkloadRef): void => {
    ensureRegistered(workloadType);
    ensureWellFormedWorkloadId(workloadId);
  };

  // `async` so that an unregistered type surfaces as a rejected promise rather than a synchronous
  // throw, which callers of a promise-returning API would not expect.
  return {
    isEnabled: delegate.isEnabled,
    create: delegate.create,
    bindWorkload: async (request, params) => {
      ensureValid(params);
      return await delegate.bindWorkload(pluginId, request, params);
    },
    unbindWorkload: async (request, params) => {
      ensureValid(params);
      return await delegate.unbindWorkload(pluginId, request, params);
    },
    getWorkloadBinding: async (params) => {
      ensureValid(params);
      return await delegate.getWorkloadBinding(pluginId, params);
    },
    withScopedRequestForWorkload: async (params, fn) => {
      ensureValid(params);
      return await delegate.withScopedRequestForWorkload(pluginId, params, fn);
    },
  };
};
