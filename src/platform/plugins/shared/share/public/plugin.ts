/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import type { Subscription } from 'rxjs';
import type { ILicense, LicensingPluginStart } from '@kbn/licensing-plugin/public';
import { ShareMenuManager, ShareMenuManagerStart } from './services';
import { ShareRegistry, ShareMenuRegistrySetup } from './services';
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
import type { BrowserUrlService } from './types';

/** @public */
export interface SharePublicSetup extends ShareMenuRegistrySetup {
  /**
   * Utilities to work with URL locators and short URLs.
   */
  url: BrowserUrlService;

  /**
   * Accepts serialized values for extracting a locator, migrating state from a provided version against
   * the locator, then using the locator to navigate.
   */
  navigate(options: RedirectOptions): void;

  /**
   * Sets the provider for the anonymous access service; this is consumed by the Security plugin to avoid a circular dependency.
   */
  setAnonymousAccessServiceProvider: (provider: () => AnonymousAccessServiceContract) => void;
}

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

  /**
   * method to get all available integrations
   */
  availableIntegrations: ShareRegistry['availableIntegrations'];
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
  private readonly shareRegistry = new ShareRegistry();
  private readonly shareContextMenu = new ShareMenuManager();
  private redirectManager?: RedirectManager;
  private url?: BrowserUrlService;
  private anonymousAccessServiceProvider?: () => AnonymousAccessServiceContract;
  private licenseSubscription?: Subscription;

  constructor(private readonly initializerContext: PluginInitializerContext) {}

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
      ...this.shareRegistry.setup(),
      url: this.url,
      navigate: (options: RedirectOptions) => this.redirectManager!.navigate(options),
      setAnonymousAccessServiceProvider: (provider: () => AnonymousAccessServiceContract) => {
        if (this.anonymousAccessServiceProvider) {
          throw new Error('Anonymous Access service provider is already set.');
        }
        this.anonymousAccessServiceProvider = provider;
      },
    };
  }

  public start(
    core: CoreStart,
    { licensing }: { licensing?: LicensingPluginStart }
  ): SharePublicStart {
    const isServerless = this.initializerContext.env.packageInfo.buildFlavor === 'serverless';

    let license: ILicense | undefined;

    this.licenseSubscription = licensing?.license$?.subscribe((_license) => {
      license = _license;
    });

    const { resolveShareItemsForShareContext, availableIntegrations } = this.shareRegistry.start({
      urlService: this.url!,
      anonymousAccessServiceProvider: () => this.anonymousAccessServiceProvider!(),
      capabilities: core.application.capabilities,
      getLicense: () => license,
    });

    const sharingContextMenuStart = this.shareContextMenu.start({
      core,
      isServerless,
      resolveShareItemsForShareContext,
    });

    return {
      ...sharingContextMenuStart,
      url: this.url!,
      navigate: (options: RedirectOptions) => this.redirectManager!.navigate(options),
      availableIntegrations,
    };
  }

  public stop() {
    this.licenseSubscription?.unsubscribe();
  }
}
