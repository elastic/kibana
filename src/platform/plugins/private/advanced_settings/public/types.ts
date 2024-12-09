/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { HomePublicPluginSetup } from '@kbn/home-plugin/public';

import { ManagementSetup } from '@kbn/management-plugin/public';
import { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
import type {
  SectionRegistrySetup,
  SectionRegistryStart,
} from '@kbn/management-settings-section-registry';

export type AdvancedSettingsSetup = SectionRegistrySetup;
export type AdvancedSettingsStart = SectionRegistryStart;

export interface AdvancedSettingsPluginSetup {
  management: ManagementSetup;
  home?: HomePublicPluginSetup;
  usageCollection?: UsageCollectionSetup;
}
