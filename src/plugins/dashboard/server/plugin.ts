/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PluginInitializerContext, CoreSetup, CoreStart, Plugin, Logger } from '@kbn/core/server';

import { EmbeddableSetup } from '@kbn/embeddable-plugin/server';
import { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import { createDashboardSavedObjectType } from './dashboard_saved_object';
import { capabilitiesProvider } from './capabilities_provider';

import { DashboardPluginSetup, DashboardPluginStart } from './types';
import { registerDashboardUsageCollector } from './usage/register_collector';
import { dashboardPersistableStateServiceFactory } from './dashboard_container/dashboard_container_embeddable_factory';
import { getUISettings } from './ui_settings';

import {
  initializeDashboardTelemetryTask,
  scheduleDashboardTelemetry,
  TASK_ID,
} from './usage/dashboard_telemetry_collection_task';

interface SetupDeps {
  embeddable: EmbeddableSetup;
  usageCollection: UsageCollectionSetup;
  taskManager: TaskManagerSetupContract;
}

interface StartDeps {
  taskManager: TaskManagerStartContract;
}

export class DashboardPlugin
  implements Plugin<DashboardPluginSetup, DashboardPluginStart, SetupDeps>
{
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

    if (plugins.taskManager) {
      initializeDashboardTelemetryTask(this.logger, core, plugins.taskManager, plugins.embeddable);
    }
    core.capabilities.registerProvider(capabilitiesProvider);

    if (plugins.usageCollection && plugins.taskManager) {
      registerDashboardUsageCollector(
        plugins.usageCollection,
        core.getStartServices().then(([_, { taskManager }]) => taskManager)
      );
    }

    plugins.embeddable.registerEmbeddableFactory(
      dashboardPersistableStateServiceFactory(plugins.embeddable)
    );

    core.uiSettings.register(getUISettings());

    return {};
  }

  public start(core: CoreStart, plugins: StartDeps) {
    this.logger.debug('dashboard: Started');

    if (plugins.taskManager) {
      scheduleDashboardTelemetry(this.logger, plugins.taskManager)
        .then(async () => {
          await plugins.taskManager.runSoon(TASK_ID);
        })
        .catch((e) => {
          this.logger.debug(`Error scheduling task, received ${e.message}`);
        });
    }

    return {};
  }

  public stop() {}
}
