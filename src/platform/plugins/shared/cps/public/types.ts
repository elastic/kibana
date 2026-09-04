/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ICPSManager, CPSAppAccessResolver } from '@kbn/cps-utils';
import type { CloudStart } from '@kbn/cloud-plugin/public';

export interface CPSPluginSetup {
  cpsEnabled?: boolean;
  /**
   * Register a dynamic access resolver for a specific app during plugin setup.
   * See {@link ICPSManager.registerAppAccess} for details.
   */
  registerAppAccess(appId: string, resolver: CPSAppAccessResolver): void;
}

export interface CPSConfigType {
  cpsEnabled: boolean;
}

export interface CPSPluginStart {
  cpsManager?: ICPSManager;
  /**
   * `true` when the active product tier is eligible for cross-project search
   * (CPS) configuration. Consumers (such as the spaces management UI) should
   * use this to gate CPS-related UI sections.
   */
  isTierEligible: boolean;
}

export interface CPSPluginStartDependencies {
  cloud?: CloudStart;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface CPSPluginStop {}
