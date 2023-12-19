/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import { EmbeddableSetup } from '@kbn/embeddable-plugin/server';
import { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import { ContentManagementServerSetup } from '@kbn/content-management-plugin/server';
import { PluginInitializerContext, CoreSetup, CoreStart, Plugin, Logger } from '@kbn/core/server';

import {
  initializeDashboardTelemetryTask,
  scheduleDashboardTelemetry,
  TASK_ID,
} from './usage/dashboard_telemetry_collection_task';
import { getUISettings } from './ui_settings';
import { DashboardStorage } from './content_management';
import { capabilitiesProvider } from './capabilities_provider';
import { DashboardPluginSetup, DashboardPluginStart } from './types';
import { createDashboardSavedObjectType } from './dashboard_saved_object';
import { CONTENT_ID, LATEST_VERSION } from '../common/content_management';
import { registerDashboardUsageCollector } from './usage/register_collector';
import { dashboardPersistableStateServiceFactory } from './dashboard_container/dashboard_container_embeddable_factory';

interface SetupDeps {
  embeddable: EmbeddableSetup;
  usageCollection?: UsageCollectionSetup;
  taskManager?: TaskManagerSetupContract;
  contentManagement: ContentManagementServerSetup;
}

interface StartDeps {
  taskManager?: TaskManagerStartContract;
}

export class DashboardPlugin
  implements Plugin<DashboardPluginSetup, DashboardPluginStart, SetupDeps, StartDeps>
{
  private readonly logger: Logger;

  constructor(private initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(
    core: CoreSetup<StartDeps>,
    { contentManagement, embeddable, taskManager, usageCollection }: SetupDeps
  ) {
    this.logger.debug('dashboard: Setup');

    core.savedObjects.registerType(
      createDashboardSavedObjectType({
        migrationDeps: {
          embeddable,
        },
      })
    );

    contentManagement.register({
      id: CONTENT_ID,
      storage: new DashboardStorage({
        throwOnResultValidationError: this.initializerContext.env.mode.dev,
        logger: this.logger.get('storage'),
      }),
      version: {
        latest: LATEST_VERSION,
      },
    });

    if (taskManager) {
      initializeDashboardTelemetryTask(this.logger, core, taskManager, embeddable);
    }
    core.capabilities.registerProvider(capabilitiesProvider);

    if (usageCollection && taskManager) {
      registerDashboardUsageCollector(
        usageCollection,
        // This cast is safe because we know that taskManager is defined on the `start` contract if it
        // exists on the`setup` contract... but Typescript can't know that.
        core.getStartServices().then(([_, { taskManager: tm }]) => tm as TaskManagerStartContract)
      );
    }

    embeddable.registerEmbeddableFactory(dashboardPersistableStateServiceFactory(embeddable));

    core.uiSettings.register(getUISettings());

    return {};
  }

  public start(_core: CoreStart, { taskManager }: StartDeps) {
    this.logger.debug('dashboard: Started');

    if (taskManager) {
      scheduleDashboardTelemetry(this.logger, taskManager)
        .then(async () => {
          await taskManager?.runSoon(TASK_ID);
        })
        .catch((e) => {
          this.logger.debug(`Error scheduling task, received ${e.message}`);
        });
    }

    return {};
  }

  public stop() {}
}
