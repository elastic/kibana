/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreId } from '../server';
import { PackageInfo, EnvironmentMode } from '../server/types';
import { CoreSetup, CoreStart } from '.';
import { ChromeService } from './chrome';
import { FatalErrorsService, FatalErrorsSetup } from './fatal_errors';
import { HttpService } from './http';
import { I18nService } from './i18n';
import {
  InjectedMetadataParams,
  InjectedMetadataService,
  InjectedMetadataSetup,
  InjectedMetadataStart,
} from './injected_metadata';
import { NotificationsService } from './notifications';
import { OverlayService } from './overlays';
import { PluginsService } from './plugins';
import { UiSettingsService } from './ui_settings';
import { ApplicationService } from './application';
import { DocLinksService } from './doc_links';
import { RenderingService } from './rendering';
import { SavedObjectsService } from './saved_objects';
import { IntegrationsService } from './integrations';
import { CoreApp } from './core_app';
import type { InternalApplicationSetup, InternalApplicationStart } from './application/types';

interface Params {
  rootDomElement: HTMLElement;
  browserSupportsCsp: boolean;
  injectedMetadata: InjectedMetadataParams['injectedMetadata'];
}

/** @internal */
export interface CoreContext {
  coreId: CoreId;
  env: {
    mode: Readonly<EnvironmentMode>;
    packageInfo: Readonly<PackageInfo>;
  };
}

/** @internal */
export interface InternalCoreSetup extends Omit<CoreSetup, 'application' | 'getStartServices'> {
  application: InternalApplicationSetup;
  injectedMetadata: InjectedMetadataSetup;
}

/** @internal */
export interface InternalCoreStart extends Omit<CoreStart, 'application'> {
  application: InternalApplicationStart;
  injectedMetadata: InjectedMetadataStart;
}

/**
 * The CoreSystem is the root of the new platform, and setups all parts
 * of Kibana in the UI, including the LegacyPlatform which is managed
 * by the LegacyPlatformService. As we migrate more things to the new
 * platform the CoreSystem will get many more Services.
 *
 * @internal
 */
export class CoreSystem {
  private readonly fatalErrors: FatalErrorsService;
  private readonly injectedMetadata: InjectedMetadataService;
  private readonly notifications: NotificationsService;
  private readonly http: HttpService;
  private readonly savedObjects: SavedObjectsService;
  private readonly uiSettings: UiSettingsService;
  private readonly chrome: ChromeService;
  private readonly i18n: I18nService;
  private readonly overlay: OverlayService;
  private readonly plugins: PluginsService;
  private readonly application: ApplicationService;
  private readonly docLinks: DocLinksService;
  private readonly rendering: RenderingService;
  private readonly integrations: IntegrationsService;
  private readonly coreApp: CoreApp;

  private readonly rootDomElement: HTMLElement;
  private readonly coreContext: CoreContext;
  private fatalErrorsSetup: FatalErrorsSetup | null = null;

  constructor(params: Params) {
    const { rootDomElement, browserSupportsCsp, injectedMetadata } = params;

    this.rootDomElement = rootDomElement;

    this.i18n = new I18nService();

    this.injectedMetadata = new InjectedMetadataService({
      injectedMetadata,
    });

    this.fatalErrors = new FatalErrorsService(rootDomElement, () => {
      // Stop Core before rendering any fatal errors into the DOM
      this.stop();
    });

    this.notifications = new NotificationsService();
    this.http = new HttpService();
    this.savedObjects = new SavedObjectsService();
    this.uiSettings = new UiSettingsService();
    this.overlay = new OverlayService();
    this.chrome = new ChromeService({ browserSupportsCsp });
    this.docLinks = new DocLinksService();
    this.rendering = new RenderingService();
    this.application = new ApplicationService();
    this.integrations = new IntegrationsService();

    this.coreContext = { coreId: Symbol('core'), env: injectedMetadata.env };
    this.plugins = new PluginsService(this.coreContext, injectedMetadata.uiPlugins);
    this.coreApp = new CoreApp(this.coreContext);
  }

  public async setup() {
    try {
      // Setup FatalErrorsService and it's dependencies first so that we're
      // able to render any errors.
      const injectedMetadata = this.injectedMetadata.setup();
      this.fatalErrorsSetup = this.fatalErrors.setup({
        injectedMetadata,
        i18n: this.i18n.getContext(),
      });
      await this.integrations.setup();
      this.docLinks.setup();
      const http = this.http.setup({ injectedMetadata, fatalErrors: this.fatalErrorsSetup });
      const uiSettings = this.uiSettings.setup({ http, injectedMetadata });
      const notifications = this.notifications.setup({ uiSettings });

      const application = this.application.setup({ http });
      this.coreApp.setup({ application, http, injectedMetadata, notifications });

      const core: InternalCoreSetup = {
        application,
        fatalErrors: this.fatalErrorsSetup,
        http,
        injectedMetadata,
        notifications,
        uiSettings,
      };

      // Services that do not expose contracts at setup
      await this.plugins.setup(core);

      return { fatalErrors: this.fatalErrorsSetup };
    } catch (error) {
      if (this.fatalErrorsSetup) {
        this.fatalErrorsSetup.add(error);
      } else {
        // If the FatalErrorsService has not yet been setup, log error to console
        // eslint-disable-next-line no-console
        console.log(error);
      }
    }
  }

  public async start() {
    try {
      const injectedMetadata = await this.injectedMetadata.start();
      const uiSettings = await this.uiSettings.start();
      const docLinks = this.docLinks.start({ injectedMetadata });
      const http = await this.http.start();
      const savedObjects = await this.savedObjects.start({ http });
      const i18n = await this.i18n.start();
      const fatalErrors = await this.fatalErrors.start();
      await this.integrations.start({ uiSettings });

      const coreUiTargetDomElement = document.createElement('div');
      coreUiTargetDomElement.id = 'kibana-body';
      const notificationsTargetDomElement = document.createElement('div');
      const overlayTargetDomElement = document.createElement('div');

      const overlays = this.overlay.start({
        i18n,
        targetDomElement: overlayTargetDomElement,
        uiSettings,
      });
      const notifications = await this.notifications.start({
        i18n,
        overlays,
        targetDomElement: notificationsTargetDomElement,
      });
      const application = await this.application.start({ http, overlays });
      const chrome = await this.chrome.start({
        application,
        docLinks,
        http,
        injectedMetadata,
        notifications,
      });

      this.coreApp.start({ application, http, notifications, uiSettings });

      const core: InternalCoreStart = {
        application,
        chrome,
        docLinks,
        http,
        savedObjects,
        i18n,
        injectedMetadata,
        notifications,
        overlays,
        uiSettings,
        fatalErrors,
      };

      await this.plugins.start(core);

      // ensure the rootDomElement is empty
      this.rootDomElement.textContent = '';
      this.rootDomElement.classList.add('coreSystemRootDomElement');
      this.rootDomElement.appendChild(coreUiTargetDomElement);
      this.rootDomElement.appendChild(notificationsTargetDomElement);
      this.rootDomElement.appendChild(overlayTargetDomElement);

      this.rendering.start({
        application,
        chrome,
        overlays,
        targetDomElement: coreUiTargetDomElement,
      });

      return {
        application,
      };
    } catch (error) {
      if (this.fatalErrorsSetup) {
        this.fatalErrorsSetup.add(error);
      } else {
        // If the FatalErrorsService has not yet been setup, log error to console
        // eslint-disable-next-line no-console
        console.error(error);
      }
    }
  }

  public stop() {
    this.plugins.stop();
    this.coreApp.stop();
    this.notifications.stop();
    this.http.stop();
    this.integrations.stop();
    this.uiSettings.stop();
    this.chrome.stop();
    this.i18n.stop();
    this.application.stop();
    this.rootDomElement.textContent = '';
  }
}
