/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import { registerContentInsights } from '@kbn/content-management-content-insights-server';
import type { ContentManagementServerSetup } from '@kbn/content-management-plugin/server';
import type {
  CoreSetup,
  CoreStart,
  Logger,
  Plugin,
  PluginInitializerContext,
  UiSettingsParams,
} from '@kbn/core/server';
import type { EmbeddableSetup, EmbeddableStart } from '@kbn/embeddable-plugin/server';
import { i18n } from '@kbn/i18n';
import type { SavedObjectTaggingStart } from '@kbn/saved-objects-tagging-plugin/server';
import type { SharePluginStart } from '@kbn/share-plugin/server';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import type {
  UsageCollectionSetup,
  UsageCollectionStart,
} from '@kbn/usage-collection-plugin/server';
import { CONTENT_ID, LATEST_VERSION } from '../common/content_management';
import { DashboardAppLocatorDefinition } from '../common/locator/locator';
import { registerAPIRoutes } from './api';
import { capabilitiesProvider } from './capabilities_provider';
import { DashboardStorage } from './content_management';
import { dashboardPersistableStateServiceFactory } from './dashboard_container/dashboard_container_embeddable_factory';
import { createDashboardSavedObjectType } from './dashboard_saved_object';
import type { DashboardPluginSetup, DashboardPluginStart } from './types';
import {
  TASK_ID,
  initializeDashboardTelemetryTask,
  scheduleDashboardTelemetry,
} from './usage/dashboard_telemetry_collection_task';
import { registerDashboardUsageCollector } from './usage/register_collector';
import { setKibanaServices } from './kibana_services';

export const DEFER_BELOW_FOLD = `labs:dashboard:deferBelowFold` as const;
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

    void core.getStartServices().then(([_, { savedObjectsTagging }]) => {
      const { contentClient } = plugins.contentManagement.register({
        id: CONTENT_ID,
        storage: new DashboardStorage({
          throwOnResultValidationError: this.initializerContext.env.mode.dev,
          logger: this.logger.get('storage'),
          savedObjectsTagging,
        }),
        version: {
          latest: LATEST_VERSION,
        },
      });
      this.contentClient = contentClient;
    });

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

    const dashboardUiSettings: Record<string, UiSettingsParams<boolean>> = {
      [DEFER_BELOW_FOLD]: {
        schema: schema.boolean(),
        requiresPageReload: true,
        category: ['Dashboard'],
        value: false,
        name: i18n.translate('dashboard.labs.enableDeferBelowFoldProjectName', {
          defaultMessage: 'Defer loading panels below "the fold"',
        }),
        description: i18n.translate('dashboard.labs.enableDeferBelowFoldProjectDescription', {
          defaultMessage:
            'Any panels below "the fold"-- the area hidden beyond the bottom of the window, accessed by scrolling-- will not be loaded immediately, but only when they enter the viewport',
        }),
      },
    };
    core.uiSettings.register(dashboardUiSettings);

    registerAPIRoutes({
      http: core.http,
      contentManagement: plugins.contentManagement,
      logger: this.logger,
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
