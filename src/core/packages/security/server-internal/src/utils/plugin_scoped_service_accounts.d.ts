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
} from '@kbn/core-security-server';
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
export declare const createPluginScopedServiceAccounts: ({
  pluginId,
  delegate,
  workloadTypes,
}: PluginScopedServiceAccountsOptions) => CoreServiceAccountsService;
