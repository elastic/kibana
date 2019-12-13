/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import './core.css';

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
import { LegacyPlatformParams, LegacyPlatformService } from './legacy';
import { NotificationsService } from './notifications';
import { OverlayService } from './overlays';
import { PluginsService } from './plugins';
import { UiSettingsService } from './ui_settings';
import { ApplicationService } from './application';
import { mapToObject, pick } from '../utils/';
import { DocLinksService } from './doc_links';
import { RenderingService } from './rendering';
import { SavedObjectsService } from './saved_objects';
import { ContextService } from './context';
import { IntegrationsService } from './integrations';
import { InternalApplicationSetup, InternalApplicationStart } from './application/types';

interface Params {
  rootDomElement: HTMLElement;
  browserSupportsCsp: boolean;
  injectedMetadata: InjectedMetadataParams['injectedMetadata'];
  requireLegacyFiles: LegacyPlatformParams['requireLegacyFiles'];
  useLegacyTestHarness?: LegacyPlatformParams['useLegacyTestHarness'];
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
  private readonly legacy: LegacyPlatformService;
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
  private readonly context: ContextService;
  private readonly integrations: IntegrationsService;

  private readonly rootDomElement: HTMLElement;
  private readonly coreContext: CoreContext;
  private fatalErrorsSetup: FatalErrorsSetup | null = null;

  constructor(params: Params) {
    const {
      rootDomElement,
      browserSupportsCsp,
      injectedMetadata,
      requireLegacyFiles,
      useLegacyTestHarness,
    } = params;

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

    this.context = new ContextService(this.coreContext);
    this.plugins = new PluginsService(this.coreContext, injectedMetadata.uiPlugins);

    this.legacy = new LegacyPlatformService({
      requireLegacyFiles,
      useLegacyTestHarness,
    });
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
      const http = this.http.setup({ injectedMetadata, fatalErrors: this.fatalErrorsSetup });
      const uiSettings = this.uiSettings.setup({ http, injectedMetadata });
      const notifications = this.notifications.setup({ uiSettings });

      const pluginDependencies = this.plugins.getOpaqueIds();
      const context = this.context.setup({
        // We inject a fake "legacy plugin" with dependencies on every plugin so that legacy plugins:
        // 1) Can access context from any NP plugin
        // 2) Can register context providers that will only be available to other legacy plugins and will not leak into
        //    New Platform plugins.
        pluginDependencies: new Map([
          ...pluginDependencies,
          [this.legacy.legacyId, [...pluginDependencies.keys()]],
        ]),
      });
      const application = this.application.setup({ context });

      const core: InternalCoreSetup = {
        application,
        context,
        fatalErrors: this.fatalErrorsSetup,
        http,
        injectedMetadata,
        notifications,
        uiSettings,
      };

      // Services that do not expose contracts at setup
      const plugins = await this.plugins.setup(core);

      await this.legacy.setup({
        core,
        plugins: mapToObject(plugins.contracts),
      });

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
      const docLinks = await this.docLinks.start({ injectedMetadata });
      const http = await this.http.start({ injectedMetadata, fatalErrors: this.fatalErrorsSetup });
      const savedObjects = await this.savedObjects.start({ http });
      const i18n = await this.i18n.start();
      const application = await this.application.start({ http, injectedMetadata });
      await this.integrations.start({ uiSettings });

      const coreUiTargetDomElement = document.createElement('div');
      coreUiTargetDomElement.id = 'kibana-body';
      const notificationsTargetDomElement = document.createElement('div');
      const overlayTargetDomElement = document.createElement('div');

      // ensure the rootDomElement is empty
      this.rootDomElement.textContent = '';
      this.rootDomElement.classList.add('coreSystemRootDomElement');
      this.rootDomElement.appendChild(coreUiTargetDomElement);
      this.rootDomElement.appendChild(notificationsTargetDomElement);
      this.rootDomElement.appendChild(overlayTargetDomElement);

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
      const chrome = await this.chrome.start({
        application,
        docLinks,
        http,
        injectedMetadata,
        notifications,
      });

      application.registerMountContext(this.coreContext.coreId, 'core', () => ({
        application: pick(application, ['capabilities', 'navigateToApp']),
        chrome,
        docLinks,
        http,
        i18n,
        injectedMetadata: pick(injectedMetadata, ['getInjectedVar']),
        notifications,
        overlays,
        savedObjects,
        uiSettings,
      }));

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
      };

      const plugins = await this.plugins.start(core);
      const rendering = this.rendering.start({
        application,
        chrome,
        injectedMetadata,
        overlays,
        targetDomElement: coreUiTargetDomElement,
      });

      await this.legacy.start({
        core,
        plugins: mapToObject(plugins.contracts),
        targetDomElement: rendering.legacyTargetDomElement,
      });
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
    this.legacy.stop();
    this.plugins.stop();
    this.notifications.stop();
    this.http.stop();
    this.integrations.stop();
    this.uiSettings.stop();
    this.chrome.stop();
    this.i18n.stop();
    this.rootDomElement.textContent = '';
  }
}
