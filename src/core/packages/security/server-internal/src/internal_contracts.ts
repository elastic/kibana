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
  SecurityServiceSetup,
  SecurityServiceStart,
  ServiceAccountWorkloadTypeRegistration,
} from '@kbn/core-security-server';
import type { CoreUiamService } from './uiam';

/**
 * Plugin-keyed counterpart of the public `CoreServiceAccountsSetup`. The plugin context closes
 * over the calling plugin's id, so plugins never supply it themselves.
 */
export interface InternalCoreServiceAccountsSetup {
  registerWorkloadType(
    pluginId: string,
    registration: ServiceAccountWorkloadTypeRegistration
  ): void;
}

export interface InternalSecurityServiceSetup
  extends Omit<SecurityServiceSetup, 'serviceAccounts'> {
  serviceAccounts: InternalCoreServiceAccountsSetup;
  /**
   * The {@link CoreUiamService | UIAM service}
   */
  uiam: CoreUiamService | null;
}

/**
 * Plugin-keyed counterpart of the public `CoreServiceAccountsService`.
 */
export interface InternalCoreServiceAccountsStart {
  /**
   * Returns the service accounts contract as one plugin sees it: its workload methods act only on
   * workload types that plugin registered, and reach the delegate with that plugin's id.
   */
  asScopedToPlugin(pluginId: string): CoreServiceAccountsService;
}

export interface InternalSecurityServiceStart
  extends Omit<SecurityServiceStart, 'serviceAccounts'> {
  serviceAccounts: InternalCoreServiceAccountsStart;
}
