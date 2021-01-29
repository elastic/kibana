/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import {
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  Plugin,
  Logger,
} from '../../../core/server';

import { createDashboardSavedObjectType } from './saved_objects';
import { capabilitiesProvider } from './capabilities_provider';

import { DashboardPluginSetup, DashboardPluginStart } from './types';
import { EmbeddableSetup } from '../../embeddable/server';
import { UsageCollectionSetup } from '../../usage_collection/server';
import { registerDashboardUsageCollector } from './usage/register_collector';

interface SetupDeps {
  embeddable: EmbeddableSetup;
  usageCollection: UsageCollectionSetup;
}

export class DashboardPlugin
  implements Plugin<DashboardPluginSetup, DashboardPluginStart, SetupDeps> {
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(core: CoreSetup, plugins: SetupDeps) {
    this.logger.debug('dashboard: Setup');

    core.savedObjects.registerType(
      createDashboardSavedObjectType({
        migrationDeps: {
          embeddable: plugins.embeddable,
        },
      })
    );
    core.capabilities.registerProvider(capabilitiesProvider);

    registerDashboardUsageCollector(plugins.usageCollection, plugins.embeddable);
    return {};
  }

  public start(core: CoreStart) {
    this.logger.debug('dashboard: Started');
    return {};
  }

  public stop() {}
}
