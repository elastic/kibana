/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Plugin as PluginClass } from '@kbn/core/public';
import type { MetricsExperienceClient } from './api';

export type { MetricsExperienceClient };

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface MetricsExperiencePluginSetup {}

export interface MetricsExperiencePluginStart {
  metricsExperienceClient: MetricsExperienceClient | undefined;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface MetricsExperiencePluginSetupDependencies {}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface MetricsExperiencePluginStartDependencies {}

export type MetricsExperiencePluginClass = PluginClass<
  MetricsExperiencePluginSetup,
  MetricsExperiencePluginStart,
  MetricsExperiencePluginSetupDependencies,
  MetricsExperiencePluginStartDependencies
>;
