/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import './index.scss';

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from 'src/core/public';
import { ShareMenuManager, ShareMenuManagerStart } from './services';
import type { SecurityOssPluginSetup, SecurityOssPluginStart } from '../../security_oss/public';
import { ShareMenuRegistry, ShareMenuRegistrySetup } from './services';
import { createShortUrlRedirectApp } from './services/short_url_redirect_app';
import {
  UrlGeneratorsService,
  UrlGeneratorsSetup,
  UrlGeneratorsStart,
} from './url_generators/url_generator_service';
import { UrlService } from '../common/url_service';
import { RedirectManager } from './url_service';
import type { RedirectOptions } from '../common/url_service/locators/redirect';
import { LegacyShortUrlLocatorDefinition } from '../common/url_service/locators/legacy_short_url_locator';

export interface ShareSetupDependencies {
  securityOss?: SecurityOssPluginSetup;
}

export interface ShareStartDependencies {
  securityOss?: SecurityOssPluginStart;
}

/** @public */
export type SharePluginSetup = ShareMenuRegistrySetup & {
  /**
   * @deprecated
   *
   * URL Generators are deprecated use UrlService instead.
   */
  urlGenerators: UrlGeneratorsSetup;

  /**
   * Utilities to work with URL locators and short URLs.
   */
  url: UrlService;

  /**
   * Accepts serialized values for extracting a locator, migrating state from a provided version against
   * the locator, then using the locator to navigate.
   */
  navigate(options: RedirectOptions): void;
};

/** @public */
export type SharePluginStart = ShareMenuManagerStart & {
  /**
   * @deprecated
   *
   * URL Generators are deprecated use UrlService instead.
   */
  urlGenerators: UrlGeneratorsStart;

  /**
   * Utilities to work with URL locators and short URLs.
   */
  url: UrlService;

  /**
   * Accepts serialized values for extracting a locator, migrating state from a provided version against
   * the locator, then using the locator to navigate.
   */
  navigate(options: RedirectOptions): void;
};

export class SharePlugin implements Plugin<SharePluginSetup, SharePluginStart> {
  private readonly shareMenuRegistry = new ShareMenuRegistry();
  private readonly shareContextMenu = new ShareMenuManager();
  private readonly urlGeneratorsService = new UrlGeneratorsService();

  private redirectManager?: RedirectManager;
  private url?: UrlService;

  constructor(private readonly initializerContext: PluginInitializerContext) {}

  public setup(core: CoreSetup, plugins: ShareSetupDependencies): SharePluginSetup {
    const { application, http } = core;
    const { basePath } = http;

    this.url = new UrlService({
      baseUrl: basePath.publicBaseUrl || basePath.serverBasePath,
      version: this.initializerContext.env.packageInfo.version,
      navigate: async ({ app, path, state }, { replace = false } = {}) => {
        const [start] = await core.getStartServices();
        await start.application.navigateToApp(app, {
          path,
          state,
          replace,
        });
      },
      getUrl: async ({ app, path }, { absolute }) => {
        const start = await core.getStartServices();
        const url = start[0].application.getUrlForApp(app, {
          path,
          absolute,
        });
        return url;
      },
      shortUrls: {
        get: () => ({
          create: async () => {
            throw new Error('Not implemented');
          },
          get: async () => {
            throw new Error('Not implemented');
          },
          delete: async () => {
            throw new Error('Not implemented');
          },
          resolve: async () => {
            throw new Error('Not implemented.');
          },
        }),
      },
    });

    this.url.locators.create(new LegacyShortUrlLocatorDefinition());

    application.register(createShortUrlRedirectApp(core, window.location, this.url));

    this.redirectManager = new RedirectManager({
      url: this.url,
    });
    this.redirectManager.registerRedirectApp(core);

    return {
      ...this.shareMenuRegistry.setup(),
      urlGenerators: this.urlGeneratorsService.setup(core),
      url: this.url,
      navigate: (options: RedirectOptions) => this.redirectManager!.navigate(options),
    };
  }

  public start(core: CoreStart, plugins: ShareStartDependencies): SharePluginStart {
    return {
      ...this.shareContextMenu.start(
        core,
        this.shareMenuRegistry.start(),
        plugins.securityOss?.anonymousAccess
      ),
      urlGenerators: this.urlGeneratorsService.start(core),
      url: this.url!,
      navigate: (options: RedirectOptions) => this.redirectManager!.navigate(options),
    };
  }
}
