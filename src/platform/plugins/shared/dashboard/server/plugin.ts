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
import type { ContentManagementServerSetup } from '@kbn/content-management-plugin/server';
import type { SharePluginStart } from '@kbn/share-plugin/server';
import type {
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  Plugin,
  Logger,
  RequestHandlerContext,
} from '@kbn/core/server';
import { registerContentInsights } from '@kbn/content-management-content-insights-server';

import type { SavedObjectTaggingStart } from '@kbn/saved-objects-tagging-plugin/server';
import type { SecurityPluginStart } from '@kbn/security-plugin-types-server';
import { registerAccessControl } from '@kbn/content-management-access-control-server';
import { tagSavedObjectTypeName } from '@kbn/saved-objects-tagging-plugin/common';
import {
  initializeDashboardTelemetryTask,
  scheduleDashboardTelemetry,
  TASK_ID,
} from './usage/dashboard_telemetry_collection_task';
import { getUISettings } from './ui_settings';
import { capabilitiesProvider } from './capabilities_provider';
import type { DashboardPluginSetup, DashboardPluginStart } from './types';
import type { DashboardSavedObjectAttributes } from './dashboard_saved_object';
import { DASHBOARD_SAVED_OBJECT_TYPE } from '../common/constants';
import { createDashboardSavedObjectType } from './dashboard_saved_object';
import { registerDashboardUsageCollector } from './usage/register_collector';
import { dashboardPersistableStateServiceFactory } from './dashboard_container/dashboard_container_embeddable_factory';
import { registerRoutes, create, read, update, deleteDashboard } from './api';
import { DashboardAppLocatorDefinition } from '../common/locator/locator';
import { setKibanaServices } from './kibana_services';
import { scanDashboards } from './scan_dashboards';
import { registerDashboardDrilldown } from './dashboard_drilldown/register_dashboard_drilldown';

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
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
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

    registerRoutes(core.http);

    void registerAccessControl({
      http: core.http,
      isAccessControlEnabled: core.savedObjects.isAccessControlEnabled(),
      getStartServices: () =>
        core.getStartServices().then(([_, { security }]) => ({
          security,
        })),
    });

    registerDashboardDrilldown(plugins.embeddable);

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
      getDashboard: async (ctx: RequestHandlerContext, id: string) => {
        const { core: coreCtx } = await ctx.resolve(['core']);
        const soResponse =
          await coreCtx.savedObjects.client.resolve<DashboardSavedObjectAttributes>(
            DASHBOARD_SAVED_OBJECT_TYPE,
            id
          );
        return {
          id: soResponse.saved_object.id,
          description: soResponse.saved_object.attributes.description,
          tags: soResponse.saved_object.references
            .filter(({ type }) => type === tagSavedObjectTypeName)
            .map((ref) => ref.id),
          title: soResponse.saved_object.attributes.title,
        };
      },
      scanDashboards,
      client: {
        create,
        read,
        update,
        delete: deleteDashboard,
      },
    };
  }

  public stop() {}
}
