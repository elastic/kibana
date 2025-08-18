/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PluginInitializerContext } from '@kbn/core/server';

import { config, configSchema } from './config';

export type { MetricsExperienceRouteRepository } from './routes';

const plugin = async (initContext: PluginInitializerContext) => {
  const { MetricsExperiencePlugin } = await import('./plugin');
  return new MetricsExperiencePlugin(initContext);
};

export { configSchema, config, plugin };
