/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { schema } from '@kbn/config-schema';
import { CoreSetup, Plugin, PluginInitializerContext } from 'kibana/server';
import { url } from './saved_objects';
import { CSV_SEPARATOR_SETTING, CSV_QUOTE_VALUES_SETTING } from '../common/constants';
import { UrlService } from '../common/url_service';
import { ServerUrlService, ServerShortUrlClientFactory } from './url_service';
import { registerUrlServiceRoutes } from './url_service/http/register_url_service_routes';
import { LegacyShortUrlLocatorDefinition } from '../common/url_service/locators/legacy_short_url_locator';

/** @public */
export interface SharePluginSetup {
  url: ServerUrlService;
}

/** @public */
export interface SharePluginStart {
  url: ServerUrlService;
}

export class SharePlugin implements Plugin<SharePluginSetup, SharePluginStart> {
  private url?: ServerUrlService;
  private version: string;

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.version = initializerContext.env.packageInfo.version;
  }

  public setup(core: CoreSetup) {
    this.url = new UrlService({
      navigate: async () => {
        throw new Error('Locator .navigate() currently is not supported on the server.');
      },
      getUrl: async () => {
        throw new Error('Locator .getUrl() currently is not supported on the server.');
      },
      shortUrls: new ServerShortUrlClientFactory({
        currentVersion: this.version,
      }),
    });

    this.url.locators.create(new LegacyShortUrlLocatorDefinition());

    const router = core.http.createRouter();

    registerUrlServiceRoutes(core, router, this.url);

    core.savedObjects.registerType(url);
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

    return {
      url: this.url,
    };
  }

  public start() {
    this.initializerContext.logger.get().debug('Starting plugin');

    return {
      url: this.url!,
    };
  }

  public stop() {
    this.initializerContext.logger.get().debug('Stopping plugin');
  }
}
