/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  BindServiceAccountWorkloadParams,
  CoreServiceAccountsService,
  ServiceAccountsServiceContract,
  ServiceAccountWorkloadBindingChange,
  ServiceAccountWorkloadRef,
} from '@kbn/core-security-server';
import {
  SERVICE_ACCOUNT_ID_MAX_LENGTH,
  SERVICE_ACCOUNT_WORKLOAD_BINDING_CHANGES_MAX,
  SERVICE_ACCOUNT_WORKLOAD_ID_MAX_LENGTH,
} from '@kbn/core-security-server';
import type { WorkloadTypeRegistry } from '../workload_type_registry';

export interface PluginScopedServiceAccountsOptions {
  pluginId: string;
  delegate: ServiceAccountsServiceContract;
  workloadTypes: WorkloadTypeRegistry;
}

/**
 * Builds the service accounts contract one plugin receives at start. The workload methods refuse
 * any workload type the plugin did not register, any malformed workload ID, and any bind that names
 * no usable service account, and otherwise call
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

  // Optional, but it ends up in the audit log, so it is held to the same bounds as a workload ID.
  const ensureWellFormedExecutionId = (executionId: string | undefined): void => {
    if (executionId === undefined) {
      return;
    }

    if (typeof executionId !== 'string' || executionId.length === 0) {
      throw new Error(
        `Plugin [${pluginId}] supplied an empty service account workload execution ID; execution IDs must be non-empty strings when supplied.`
      );
    }

    if (executionId.length > SERVICE_ACCOUNT_WORKLOAD_ID_MAX_LENGTH) {
      throw new Error(
        `Plugin [${pluginId}] supplied a service account workload execution ID that is too long: it must be at most ${SERVICE_ACCOUNT_WORKLOAD_ID_MAX_LENGTH} characters, but got ${executionId.length}.`
      );
    }
  };

  // A bind that names no account must never reach the store: it would replace the workload's
  // binding with one that can never mint, and audit a bind that names no target.
  const ensureWellFormedServiceAccountId = (serviceAccountId: string): void => {
    if (typeof serviceAccountId !== 'string' || serviceAccountId.length === 0) {
      throw new Error(
        `Plugin [${pluginId}] supplied an empty service account ID; a bind must name the service account as a non-empty string.`
      );
    }

    if (serviceAccountId.length > SERVICE_ACCOUNT_ID_MAX_LENGTH) {
      throw new Error(
        `Plugin [${pluginId}] supplied a service account ID that is too long: it must be at most ${SERVICE_ACCOUNT_ID_MAX_LENGTH} characters, but got ${serviceAccountId.length}.`
      );
    }
  };

  const ensureValid = ({ workloadType, workloadId }: ServiceAccountWorkloadRef): void => {
    ensureRegistered(workloadType);
    ensureWellFormedWorkloadId(workloadId);
  };

  const ensureValidBind = (params: BindServiceAccountWorkloadParams): void => {
    ensureValid(params);
    ensureWellFormedServiceAccountId(params.serviceAccountId);
  };

  /**
   * Copies the changes, keeping only the fields a change has, and checks every copy before any
   * change is applied, so a malformed batch changes nothing. The delegate gets the copies: what it
   * applies is what was checked, however the caller's own array changes meanwhile.
   */
  const toValidChanges = (
    changes: readonly ServiceAccountWorkloadBindingChange[]
  ): ServiceAccountWorkloadBindingChange[] => {
    if (!Array.isArray(changes)) {
      throw new Error(
        `Plugin [${pluginId}] supplied service account workload binding changes that are not an array.`
      );
    }

    if (changes.length > SERVICE_ACCOUNT_WORKLOAD_BINDING_CHANGES_MAX) {
      throw new Error(
        `Plugin [${pluginId}] supplied too many service account workload binding changes: at most ${SERVICE_ACCOUNT_WORKLOAD_BINDING_CHANGES_MAX} are allowed in one call, but got ${changes.length}.`
      );
    }

    // Keyed the way a binding is, so two changes to one workload are caught however they are
    // spelled. Two changes to one workload in one call have no defined order to apply them in.
    const seen = new Set<string>();
    return changes.map((change) => {
      const copy = copyChange(change);

      const key = JSON.stringify([copy.workloadType, copy.workloadId]);
      if (seen.has(key)) {
        throw new Error(
          `Plugin [${pluginId}] supplied more than one service account workload binding change for workload [${copy.workloadType}/${copy.workloadId}].`
        );
      }
      seen.add(key);

      return copy;
    });
  };

  const copyChange = (
    change: ServiceAccountWorkloadBindingChange
  ): ServiceAccountWorkloadBindingChange => {
    const op = change?.op;
    if (op === 'bind') {
      const { workloadType, workloadId, serviceAccountId } = change;
      const copy = { op, workloadType, workloadId, serviceAccountId };
      ensureValidBind(copy);
      return copy;
    }

    if (op === 'unbind') {
      const { workloadType, workloadId } = change;
      const copy = { op, workloadType, workloadId };
      ensureValid(copy);
      return copy;
    }

    throw new Error(
      `Plugin [${pluginId}] supplied a service account workload binding change with an unknown operation; it must be "bind" or "unbind".`
    );
  };

  // `async` so that an unregistered type surfaces as a rejected promise rather than a synchronous
  // throw, which callers of a promise-returning API would not expect.
  return {
    isEnabled: delegate.isEnabled,
    create: delegate.create,
    delete: delegate.delete,
    bindWorkload: async (request, params) => {
      ensureValidBind(params);
      return await delegate.bindWorkload(pluginId, request, params);
    },
    unbindWorkload: async (request, params) => {
      ensureValid(params);
      return await delegate.unbindWorkload(pluginId, request, params);
    },
    bulkUpdateWorkloadBindings: async (request, changes) => {
      return await delegate.bulkUpdateWorkloadBindings(pluginId, request, toValidChanges(changes));
    },
    getWorkloadBinding: async (params) => {
      ensureValid(params);
      return await delegate.getWorkloadBinding(pluginId, params);
    },
    getWorkloadServiceAccountSummary: async (params) => {
      ensureValid(params);
      return await delegate.getWorkloadServiceAccountSummary(pluginId, params);
    },
    withScopedRequestForWorkload: async (params, fn) => {
      ensureValid(params);
      ensureWellFormedExecutionId(params.executionId);
      return await delegate.withScopedRequestForWorkload(pluginId, params, fn);
    },
  };
};
