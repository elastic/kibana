/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import type { EmbeddableSetup, EmbeddableStart } from '@kbn/embeddable-plugin/server';
import type {
  UsageCollectionSetup,
  UsageCollectionStart,
} from '@kbn/usage-collection-plugin/server';
import type {
  ContentManagementServerSetup,
  ContentStorage,
} from '@kbn/content-management-plugin/server';
import type { SharePluginStart } from '@kbn/share-plugin/server';
import type {
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  Plugin,
  Logger,
} from '@kbn/core/server';
import { registerContentInsights } from '@kbn/content-management-content-insights-server';

import type { SavedObjectTaggingStart } from '@kbn/saved-objects-tagging-plugin/server';
import type { SecurityPluginStart } from '@kbn/security-plugin-types-server';
import { registerAccessControl } from '@kbn/content-management-access-control-server';
import {
  initializeDashboardTelemetryTask,
  scheduleDashboardTelemetry,
  TASK_ID,
} from './usage/dashboard_telemetry_collection_task';
import { getUISettings } from './ui_settings';
import type { DashboardItem } from './content_management';
import { DashboardStorage } from './content_management';
import { capabilitiesProvider } from './capabilities_provider';
import type { DashboardPluginSetup, DashboardPluginStart } from './types';
import { createDashboardSavedObjectType } from './dashboard_saved_object';
import { CONTENT_ID, LATEST_VERSION } from '../common/content_management';
import { registerDashboardUsageCollector } from './usage/register_collector';
import { dashboardPersistableStateServiceFactory } from './dashboard_container/dashboard_container_embeddable_factory';
import { registerAPIRoutes } from './api';
import { DashboardAppLocatorDefinition } from '../common/locator/locator';
import { setKibanaServices } from './kibana_services';

interface SetupDeps {
  embeddable: EmbeddableSetup;
  usageCollection?: UsageCollectionSetup;
  taskManager: TaskManagerSetupContract;
  contentManagement: ContentManagementServerSetup;
}

export interface StartDeps {
  embeddable: EmbeddableStart;
  taskManager: TaskManagerStartContract;
  usageCollection?: UsageCollectionStart;
  savedObjectsTagging?: SavedObjectTaggingStart;
  share?: SharePluginStart;
  security?: SecurityPluginStart;
}

export class DashboardPlugin
  implements Plugin<DashboardPluginSetup, DashboardPluginStart, SetupDeps, StartDeps>
{
  private contentClient?: ReturnType<ContentManagementServerSetup['register']>['contentClient'];
  private readonly logger: Logger;

  constructor(private initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(core: CoreSetup<StartDeps, DashboardPluginStart>, plugins: SetupDeps) {
    this.logger.debug('dashboard: Setup');

    core.savedObjects.registerType(
      createDashboardSavedObjectType({
        migrationDeps: {
          embeddable: plugins.embeddable,
        },
      })
    );

    const { contentClient } = plugins.contentManagement.register<ContentStorage<DashboardItem>>({
      id: CONTENT_ID,
      storage: new DashboardStorage({
        throwOnResultValidationError: this.initializerContext.env.mode.dev,
        logger: this.logger.get('storage'),
        isAccessControlEnabled: core.savedObjects.isAccessControlEnabled(),
      }),
      version: {
        latest: LATEST_VERSION,
      },
    });
    this.contentClient = contentClient;

    plugins.contentManagement.favorites.registerFavoriteType('dashboard');

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

    if (plugins.usageCollection) {
      // Registers routes for tracking and fetching dashboard views
      registerContentInsights(
        {
          usageCollection: plugins.usageCollection,
          http: core.http,
          getStartServices: () =>
            core.getStartServices().then(([_, start]) => ({
              usageCollection: start.usageCollection!,
            })),
        },
        {
          domainId: 'dashboard',
          // makes sure that only users with read/all access to dashboard app can access the routes
          routePrivileges: ['dashboardUsageStats'],
        }
      );
    }

    plugins.embeddable.registerEmbeddableFactory(
      dashboardPersistableStateServiceFactory(plugins.embeddable)
    );

    core.uiSettings.register(getUISettings());

    registerAPIRoutes({
      http: core.http,
      contentManagement: plugins.contentManagement,
      logger: this.logger,
    });

    void registerAccessControl({
      http: core.http,
      isAccessControlEnabled: core.savedObjects.isAccessControlEnabled(),
      getStartServices: () =>
        core.getStartServices().then(([_, { security }]) => ({
          security,
        })),
    });

    return {};
  }

  public start(core: CoreStart, plugins: StartDeps) {
    this.logger.debug('dashboard: Started');

    setKibanaServices(plugins, this.logger);

    if (plugins.share) {
      plugins.share.url.locators.create(
        new DashboardAppLocatorDefinition({
          useHashedUrl: false,
          getDashboardFilterFields: async (dashboardId: string) => {
            throw new Error(
              'Locator .getLocation() is not supported on the server with the `preserveSavedFilters` parameter.'
            );
          },
        })
      );
    }

    if (plugins.taskManager) {
      scheduleDashboardTelemetry(this.logger, plugins.taskManager)
        .then(async () => {
          await plugins.taskManager.runSoon(TASK_ID);
        })
        .catch((e) => {
          this.logger.debug(`Error scheduling task, received ${e.message}`);
        });
    }

    return {
      getContentClient: () => this.contentClient,
    };
  }

  public stop() {}
}
