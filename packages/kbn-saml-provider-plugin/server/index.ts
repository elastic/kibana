/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CloudSetup } from '@kbn/cloud-plugin/server';
import type { Plugin, PluginInitializer } from '@kbn/core/server';

import { initRoutes } from './init_routes';

export interface PluginSetupDependencies {
  cloud?: CloudSetup;
}

export const plugin: PluginInitializer<void, void, PluginSetupDependencies> = async (
  context
): Promise<Plugin> => ({
  setup: (core, plugins: PluginSetupDependencies) => initRoutes(context, core, plugins),
  start: () => {},
  stop: () => {},
});
