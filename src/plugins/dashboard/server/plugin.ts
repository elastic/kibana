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
import { registerAPIRoutes } from '@kbn/content-management-api';
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
import { CONTENT_ID, DashboardItem, LATEST_VERSION } from '../common/content_management';
import { registerDashboardUsageCollector } from './usage/register_collector';
import { dashboardPersistableStateServiceFactory } from './dashboard_container/dashboard_container_embeddable_factory';
import { v2023_10_31, v2024_06_24 } from '../common/api';
import { Dashboard as Dashboard_v2023_10_31 } from '../common/api/2023_10_31';
import { Dashboard as Dashboard_v2024_06_24 } from '../common/api/2024_06_24';

interface SetupDeps {
  embeddable: EmbeddableSetup;
  usageCollection: UsageCollectionSetup;
  taskManager: TaskManagerSetupContract;
  contentManagement: ContentManagementServerSetup;
}

interface StartDeps {
  taskManager: TaskManagerStartContract;
}

export class DashboardPlugin
  implements Plugin<DashboardPluginSetup, DashboardPluginStart, SetupDeps>
{
  private readonly logger: Logger;

  constructor(private initializerContext: PluginInitializerContext) {
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

    registerAPIRoutes({
      http: core.http,
      contentManagement: plugins.contentManagement,
      appName: 'dashboards',
      contentId: CONTENT_ID,
      getSchemas: () => {
        return {
          '2023-10-31': {
            schema: v2023_10_31.baseDashboard,
          },
          '2024-06-24': {
            schema: v2024_06_24.baseDashboard,
          },
        };
      },
      getTransforms: () => {
        return {
          '2023-10-31': {
            inTransform: (data: Dashboard_v2023_10_31) => data,
            outTransform: ({ id, attributes }: DashboardItem) => ({
              id,
              description: attributes.description,
              title: attributes.title,
              kibanaSavedObjectMeta: attributes.kibanaSavedObjectMeta,
              timeRestore: attributes.timeRestore,
              timeFrom: attributes.timeFrom,
              optionsJSON: attributes.optionsJSON,
              panelsJSON: attributes.panelsJSON,
              controlGroupInput: attributes.controlGroupInput,
              refreshInterval: attributes.refreshInterval,
              timeTo: attributes.timeTo,
            }),
          },
          '2024-06-24': {
            inTransform: (data: Dashboard_v2024_06_24) => {
              const { panels, options, kibanaSavedObjectMeta, ...restAttributes } = data;
              const { searchSource, ...restKibanaSavedObjectMeta } = kibanaSavedObjectMeta;
              return {
                ...restAttributes,
                kibanaSavedObjectMeta: {
                  ...restKibanaSavedObjectMeta,
                  searchSourceJSON: JSON.stringify(searchSource),
                },
                panelsJSON: JSON.stringify(data.panels),
                optionsJSON: JSON.stringify(data.options),
              };
            },
            outTransform: ({ id, attributes }: DashboardItem) => {
              const { panelsJSON, optionsJSON, version, ...restAttributes } = attributes;
              const { searchSourceJSON, ...restKibanaSavedObjectMeta } =
                attributes.kibanaSavedObjectMeta;
              return {
                id,
                ...restAttributes,
                kibanaSavedObjectMeta: {
                  ...restKibanaSavedObjectMeta,
                  searchSource: JSON.parse(searchSourceJSON),
                },
                panels: JSON.parse(panelsJSON),
                options: JSON.parse(optionsJSON ?? ''),
              };
            },
          },
        };
      },
    });

    plugins.contentManagement.register({
      id: CONTENT_ID,
      storage: new DashboardStorage({
        throwOnResultValidationError: this.initializerContext.env.mode.dev,
        logger: this.logger.get('storage'),
      }),
      version: {
        latest: LATEST_VERSION,
      },
    });

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
