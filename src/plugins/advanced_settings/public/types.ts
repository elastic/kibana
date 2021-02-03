/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { ComponentRegistry } from './component_registry';
import { HomePublicPluginSetup } from '../../home/public';

import { ManagementSetup } from '../../management/public';
import { UsageCollectionSetup } from '../../usage_collection/public';

export interface AdvancedSettingsSetup {
  component: ComponentRegistry['setup'];
}
export interface AdvancedSettingsStart {
  component: ComponentRegistry['start'];
}

export interface AdvancedSettingsPluginSetup {
  management: ManagementSetup;
  home?: HomePublicPluginSetup;
  usageCollection?: UsageCollectionSetup;
}

export { ComponentRegistry };
