/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreSecurityDelegateContract } from '@kbn/core-security-server';
import type { InternalSecurityServiceStart } from '../internal_contracts';
import type { WorkloadTypeRegistry } from '../workload_type_registry';
import { createPluginScopedServiceAccounts } from './plugin_scoped_service_accounts';

export const convertSecurityApi = (
  privateApi: CoreSecurityDelegateContract,
  workloadTypes: WorkloadTypeRegistry
): InternalSecurityServiceStart => {
  return {
    authc: {
      getCurrentUser: privateApi.authc.getCurrentUser,
      getPrincipal: privateApi.authc.getPrincipal,
      getRedactedSessionId: privateApi.authc.getRedactedSessionId,
      apiKeys: privateApi.authc.apiKeys,
    },
    audit: privateApi.audit,
    // The delegate's workload methods are keyed by plugin id, which only the plugin context knows.
    // They are therefore not exposed directly: each plugin gets a contract scoped to itself.
    serviceAccounts: {
      asScopedToPlugin: (pluginId) =>
        createPluginScopedServiceAccounts({
          pluginId,
          delegate: privateApi.serviceAccounts,
          workloadTypes,
        }),
    },
  };
};
