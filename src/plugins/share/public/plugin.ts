/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import './index.scss';

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import { ShareMenuManager, ShareMenuManagerStart } from './services';
import { ShareMenuRegistry, ShareMenuRegistrySetup } from './services';
import { UrlService } from '../common/url_service';
import { RedirectManager } from './url_service';
import type { RedirectOptions } from '../common/url_service/locators/redirect';
import {
  BrowserShortUrlClientFactory,
  BrowserShortUrlClientFactoryCreateParams,
} from './url_service/short_urls/short_url_client_factory';
import type { BrowserShortUrlClient } from './url_service/short_urls/short_url_client';
import { AnonymousAccessServiceContract } from '../common';
import { LegacyShortUrlLocatorDefinition } from '../common/url_service/locators/legacy_short_url_locator';
import { ShortUrlRedirectLocatorDefinition } from '../common/url_service/locators/short_url_redirect_locator';
import { registrations } from './lib/registrations';
import type { BrowserUrlService, ClientConfigType } from './types';

/** @public */
export type SharePublicSetup = ShareMenuRegistrySetup & {
  /**
   * Utilities to work with URL locators and short URLs.
   */
  url: BrowserUrlService;

  /**
   * this plugin exposes the kibana version for other plugins needing to pass a Reporting API client
   */
  kibanaVersion: string;

  /**
   * Accepts serialized values for extracting a locator, migrating state from a provided version against
   * the locator, then using the locator to navigate.
   */
  navigate(options: RedirectOptions): void;

  /**
   * Sets the provider for the anonymous access service; this is consumed by the Security plugin to avoid a circular dependency.
   */
  setAnonymousAccessServiceProvider: (provider: () => AnonymousAccessServiceContract) => void;
  /**
   * Allows for canvas to register the older versioned way whereas reporting for Discover/Lens/Dashboard
   * can use the new share version and show the share context modals
   */
  isNewVersion: boolean;
};

/** @public */
export type SharePublicStart = ShareMenuManagerStart & {
  /**
   * Utilities to work with URL locators and short URLs.
   */
  url: BrowserUrlService;

  /**
   * Accepts serialized values for extracting a locator, migrating state from a provided version against
   * the locator, then using the locator to navigate.
   */
  navigate(options: RedirectOptions): void;
};

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface SharePublicSetupDependencies {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface SharePublicStartDependencies {}

export class SharePlugin
  implements
    Plugin<
      SharePublicSetup,
      SharePublicStart,
      SharePublicSetupDependencies,
      SharePublicStartDependencies
    >
{
  private config: ClientConfigType;
  private readonly shareMenuRegistry?: ShareMenuRegistry;
  private readonly shareContextMenu = new ShareMenuManager();
  private redirectManager?: RedirectManager;
  private url?: BrowserUrlService;
  private anonymousAccessServiceProvider?: () => AnonymousAccessServiceContract;
  private kibanaVersion: string;

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.config = initializerContext.config.get<ClientConfigType>();
    this.kibanaVersion = initializerContext.env.packageInfo.version;
    this.shareMenuRegistry = new ShareMenuRegistry(this.config.new_version.enabled);
  }

  public setup(core: CoreSetup): SharePublicSetup {
    const { analytics, http } = core;
    const { basePath } = http;

    this.url = new UrlService<BrowserShortUrlClientFactoryCreateParams, BrowserShortUrlClient>({
      baseUrl: basePath.get(),
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
      shortUrls: ({ locators }) =>
        new BrowserShortUrlClientFactory({
          http,
          locators,
        }),
    });

    this.url.locators.create(new LegacyShortUrlLocatorDefinition());
    this.url.locators.create(new ShortUrlRedirectLocatorDefinition());

    this.redirectManager = new RedirectManager({
      url: this.url,
    });
    this.redirectManager.registerLocatorRedirectApp(core);
    this.redirectManager.registerLegacyShortUrlRedirectApp(core);

    registrations.setup({ analytics });

    return {
      ...this.shareMenuRegistry!.setup(),
      kibanaVersion: this.kibanaVersion,
      url: this.url,
      navigate: (options: RedirectOptions) => this.redirectManager!.navigate(options),
      setAnonymousAccessServiceProvider: (provider: () => AnonymousAccessServiceContract) => {
        if (this.anonymousAccessServiceProvider) {
          throw new Error('Anonymous Access service provider is already set.');
        }
        this.anonymousAccessServiceProvider = provider;
      },
      isNewVersion: this.config.new_version.enabled,
    };
  }

  public start(core: CoreStart): SharePublicStart {
    const disableEmbed = this.initializerContext.env.packageInfo.buildFlavor === 'serverless';
    const sharingContextMenuStart = this.shareContextMenu.start(
      core,
      this.url!,
      this.shareMenuRegistry!.start(),
      disableEmbed,
      this.config.new_version.enabled ?? false,
      this.anonymousAccessServiceProvider
    );

    return {
      ...sharingContextMenuStart,
      url: this.url!,
      navigate: (options: RedirectOptions) => this.redirectManager!.navigate(options),
    };
  }
}
