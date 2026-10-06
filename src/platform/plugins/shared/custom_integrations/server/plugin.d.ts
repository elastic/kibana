/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PluginInitializerContext, CoreSetup, CoreStart, Plugin } from '@kbn/core/server';
import type { CustomIntegrationsPluginSetup, CustomIntegrationsPluginStart } from './types';
export declare class CustomIntegrationsPlugin
  implements Plugin<CustomIntegrationsPluginSetup, CustomIntegrationsPluginStart>
{
  private readonly logger;
  private readonly customIngegrationRegistry;
  private readonly branch;
  constructor(initializerContext: PluginInitializerContext);
  setup(core: CoreSetup): CustomIntegrationsPluginSetup;
  start(core: CoreStart): {};
  stop(): void;
}
