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
