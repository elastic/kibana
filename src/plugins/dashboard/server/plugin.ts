/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
import { EmbeddableSetup, EmbeddableStart } from '../../embeddable/server';
import { UsageCollectionSetup } from '../../usage_collection/server';
import { registerDashboardUsageCollector } from './usage/register_collector';
import { dashboardPersistableStateServiceFactory } from './embeddable/dashboard_container_embeddable_factory';

interface SetupDeps {
  embeddable: EmbeddableSetup;
  usageCollection: UsageCollectionSetup;
}

interface StartDeps {
  embeddable: EmbeddableStart;
}

export class DashboardPlugin
  implements Plugin<DashboardPluginSetup, DashboardPluginStart, SetupDeps, StartDeps> {
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(core: CoreSetup<StartDeps>, plugins: SetupDeps) {
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

    (async () => {
      const [, startPlugins] = await core.getStartServices();

      plugins.embeddable.registerEmbeddableFactory(
        dashboardPersistableStateServiceFactory(startPlugins.embeddable)
      );
    })();

    return {};
  }

  public start(core: CoreStart) {
    this.logger.debug('dashboard: Started');
    return {};
  }

  public stop() {}
}
