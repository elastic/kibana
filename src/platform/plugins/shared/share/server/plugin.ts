/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { schema } from '@kbn/config-schema';
import { CoreSetup, CoreStart, Logger, Plugin, PluginInitializerContext } from '@kbn/core/server';
import {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import { registerDeleteUnusedUrlsRoute } from './unused_urls_task/register_delete_unused_urls_route';
import {
  TASK_ID,
  runDeleteUnusedUrlsTask,
  scheduleUnusedUrlsCleanupTask,
} from './unused_urls_task';
import { CSV_SEPARATOR_SETTING, CSV_QUOTE_VALUES_SETTING } from '../common/constants';
import { UrlService } from '../common/url_service';
import {
  ServerUrlService,
  ServerShortUrlClientFactory,
  registerUrlServiceRoutes,
  registerUrlServiceSavedObjectType,
} from './url_service';
import { LegacyShortUrlLocatorDefinition } from '../common/url_service/locators/legacy_short_url_locator';
import { ShortUrlRedirectLocatorDefinition } from '../common/url_service/locators/short_url_redirect_locator';
import { ConfigSchema } from './config';

/** @public */
export interface SharePublicSetup {
  url: ServerUrlService;
}

/** @public */
export interface SharePublicStart {
  url: ServerUrlService;
}

export interface SharePublicSetupDependencies {
  taskManager?: TaskManagerSetupContract;
}

export interface SharePublicStartDependencies {
  taskManager?: TaskManagerStartContract;
}

export class SharePlugin
  implements
    Plugin<
      SharePublicSetup,
      SharePublicStart,
      SharePublicSetupDependencies,
      SharePublicStartDependencies
    >
{
  private url?: ServerUrlService;
  private readonly version: string;
  private readonly logger: Logger;
  private readonly config: ConfigSchema;

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.version = initializerContext.env.packageInfo.version;
    this.logger = initializerContext.logger.get();
    this.config = initializerContext.config.get<ConfigSchema>();
  }

  public setup(core: CoreSetup, { taskManager }: SharePublicSetupDependencies) {
    this.url = new UrlService({
      baseUrl: core.http.basePath.publicBaseUrl || core.http.basePath.serverBasePath,
      version: this.initializerContext.env.packageInfo.version,
      navigate: async () => {
        throw new Error('Locator .navigate() is not supported on the server.');
      },
      getUrl: async () => {
        throw new Error('Locator .getUrl() currently is not supported on the server.');
      },
      shortUrls: ({ locators }) =>
        new ServerShortUrlClientFactory({
          currentVersion: this.version,
          locators,
        }),
    });
    this.url.locators.create(new LegacyShortUrlLocatorDefinition());
    this.url.locators.create(new ShortUrlRedirectLocatorDefinition());

    registerUrlServiceSavedObjectType(core.savedObjects, this.url);
    registerUrlServiceRoutes(core, core.http.createRouter(), this.url);

    registerDeleteUnusedUrlsRoute({
      router: core.http.createRouter(),
      core,
      urlExpirationDuration: this.config.url_expiration.duration,
      urlLimit: this.config.url_expiration.url_limit,
      logger: this.logger,
      isEnabled: this.config.url_expiration.enabled && Boolean(taskManager),
    });

    core.uiSettings.register({
      [CSV_SEPARATOR_SETTING]: {
        name: i18n.translate('share.advancedSettings.csv.separatorTitle', {
          defaultMessage: 'CSV separator',
        }),
        value: ',',
        description: i18n.translate('share.advancedSettings.csv.separatorText', {
          defaultMessage: 'Separate exported values with this string',
        }),
        schema: schema.string(),
      },
      [CSV_QUOTE_VALUES_SETTING]: {
        name: i18n.translate('share.advancedSettings.csv.quoteValuesTitle', {
          defaultMessage: 'Quote CSV values',
        }),
        value: true,
        description: i18n.translate('share.advancedSettings.csv.quoteValuesText', {
          defaultMessage: 'Should values be quoted in csv exports?',
        }),
        schema: schema.boolean(),
      },
    });

    if (taskManager) {
      taskManager.registerTaskDefinitions({
        [TASK_ID]: {
          title: 'Unused URLs Cleanup',
          description: "Deletes unused saved objects of type 'url'",
          maxAttempts: 5,
          createTaskRunner: () => ({
            run: async () => {
              await runDeleteUnusedUrlsTask({
                core,
                urlExpirationDuration: this.config.url_expiration.duration,
                logger: this.logger,
                urlLimit: this.config.url_expiration.url_limit,
                isEnabled: this.config.url_expiration.enabled,
              });
            },
          }),
        },
      });
    }

    return {
      url: this.url,
    };
  }

  public start(_core: CoreStart, { taskManager }: SharePublicStartDependencies) {
    this.logger.debug('Starting plugin');

    if (taskManager) {
      void scheduleUnusedUrlsCleanupTask({
        taskManager,
        checkInterval: this.config.url_expiration.check_interval,
        isEnabled: this.config.url_expiration.enabled,
      });
    }

    return {
      url: this.url!,
    };
  }

  public stop() {
    this.logger.debug('Stopping plugin');
  }
}
