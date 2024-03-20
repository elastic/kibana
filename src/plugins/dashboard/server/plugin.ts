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
import { schema } from '@kbn/config-schema';
import { PluginInitializerContext, CoreSetup, CoreStart, Plugin, Logger } from '@kbn/core/server';
import type { SecurityPluginStart } from '@kbn/security-plugin-types-server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';

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
  usageCollection: UsageCollectionSetup;
  taskManager: TaskManagerSetupContract;
  contentManagement: ContentManagementServerSetup;
}

interface StartDeps {
  taskManager: TaskManagerStartContract;
  security?: SecurityPluginStart;
  spaces?: SpacesPluginStart;
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

    core.http.createRouter().post(
      {
        path: '/internal/user_profiles_dashboard/_suggest',
        validate: {
          body: schema.object({
            name: schema.string(),
            dataPath: schema.maybe(schema.string()),
          }),
        },
        // TODO:
        // /**
        //  * Important: You must restrict access to this endpoint using access `tags`.
        //  */
        // options: { tags: ['access:suggestUserProfiles'] },
      },
      async (context, request, response) => {
        const [, pluginDeps] = await core.getStartServices();

        /**
         * Important: `requiredPrivileges` must be hard-coded server-side and cannot be exposed as a
         * param client-side.
         *
         * If your app requires suggestions based on different privileges you must expose separate
         * endpoints for each use-case.
         *
         * In this example we ensure that suggested users have access to the current space and are
         * able to login but in your app you will want to change that to something more relevant.
         */
        try {
          const profiles = await pluginDeps.security!.userProfiles.suggest({
            name: request.body.name,
            dataPath: request.body.dataPath,
            requiredPrivileges: {
              spaceId: pluginDeps.spaces!.spacesService.getSpaceId(request),
              privileges: {
                kibana: [pluginDeps.security!.authz.actions.login],
              },
            },
          });

          return response.ok({ body: profiles });
        } catch (e) {
          this.logger.error(e);
          return response.customError(e);
        }
      }
    );

    core.savedObjects.registerType(
      createDashboardSavedObjectType({
        migrationDeps: {
          embeddable: plugins.embeddable,
        },
      })
    );

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
