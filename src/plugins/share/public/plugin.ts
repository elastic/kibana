/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import './index.scss';

import * as Rx from 'rxjs';
import { CONTEXT_MENU_TRIGGER } from '@kbn/embeddable-plugin/public';
import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import { ReportingAPIClient } from '@kbn/reporting-public';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/public';
import { UiActionsSetup, UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { ReportingSetup } from '@kbn/reporting-plugin/public';
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
import { ReportingPublicComponents } from './components/share/target/types';
import {
  ReportingCsvPanelAction,
  reportingCsvShareProvider,
  reportingScreenshotShareProvider,
} from './components/share';

export interface ShareReportingContract {
  /**
   * A set of React components for displaying a Reporting share menu in an application
   */
  components: ReportingPublicComponents;
}

/** @public */
export type SharePublicSetup = ShareMenuRegistrySetup & {
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

export interface SharePublicSetupDependencies {
  uiActions: UiActionsSetup;
  reporting?: ReportingSetup;
}

export interface SharePublicStartDependencies {
  uiActions: UiActionsStart;
  data: DataPublicPluginStart;
  licensing?: LicensingPluginStart;
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
  private config: ClientConfigType;
  private readonly shareMenuRegistry = new ShareMenuRegistry();
  private readonly shareContextMenu = new ShareMenuManager();
  private redirectManager?: RedirectManager;
  private url?: BrowserUrlService;
  private anonymousAccessServiceProvider?: () => AnonymousAccessServiceContract;
  private kibanaVersion?: string;
  private contract?: ShareReportingContract;

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.config = initializerContext.config.get<ClientConfigType>();
    this.kibanaVersion = initializerContext.env.packageInfo.version;
  }

  public setup(
    core: CoreSetup<SharePublicSetupDependencies>,
    { uiActions, reporting }: SharePublicSetupDependencies
  ): SharePublicSetup {
    const { analytics, http, getStartServices, notifications, uiSettings } = core;
    const { basePath } = http;
    const { toasts } = notifications;
    const apiClient = new ReportingAPIClient(http, uiSettings, this.kibanaVersion!);
    const startServices$ = Rx.from(getStartServices());

    if (reporting) {
      const usesUiCapabilities = reporting?.usesUiCapabilities();
      uiActions.addTriggerAction(
        CONTEXT_MENU_TRIGGER,
        new ReportingCsvPanelAction({ core, apiClient, startServices$, usesUiCapabilities })
      );

      startServices$.subscribe(([{ application }, { licensing }]) => {
        licensing.license$.subscribe((license: any) => {
          reportingCsvShareProvider({
            apiClient,
            toasts,
            uiSettings,
            license,
            application,
            usesUiCapabilities,
            theme: core.theme,
          });
        });

        if (reporting?.export_types.pdf.enabled || reporting?.export_types.png.enabled) {
          reportingScreenshotShareProvider({
            apiClient,
            toasts,
            uiSettings,
            license,
            application,
            usesUiCapabilities,
            theme: core.theme,
          });
        }
      });
    }

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
      ...this.shareMenuRegistry.setup(),
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

  public start(core: CoreStart, { licensing }: SharePublicStartDependencies): SharePublicStart {
    const reportingApiClient = new ReportingAPIClient(
      core.http,
      core.uiSettings,
      this.kibanaVersion!
    );
    const disableEmbed = this.initializerContext.env.packageInfo.buildFlavor === 'serverless';
    const sharingContextMenuStart = this.shareContextMenu.start(
      core,
      this.url!,
      this.shareMenuRegistry.start(),
      disableEmbed,
      this.config.new_version.enabled ?? false,
      reportingApiClient,
      this.anonymousAccessServiceProvider
    );

    return {
      ...sharingContextMenuStart,
      url: this.url!,
      navigate: (options: RedirectOptions) => this.redirectManager!.navigate(options),
    };
  }
}
