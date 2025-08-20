/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Plugin as PluginClass } from '@kbn/core/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { MetricsExperienceRepositoryClient } from './api';

export interface MetricsExperienceService {
  callApi: MetricsExperienceRepositoryClient;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface MetricsExperiencePluginSetup {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface MetricsExperiencePluginStart {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface MetricsExperiencePluginSetupDependencies {}

export interface MetricsExperiencePluginStartDependencies {
  dataViews: DataViewsPublicPluginStart;
}

export type MetricsExperiencePluginClass = PluginClass<
  MetricsExperiencePluginSetup,
  MetricsExperiencePluginStart,
  MetricsExperiencePluginSetupDependencies,
  MetricsExperiencePluginStartDependencies
>;
