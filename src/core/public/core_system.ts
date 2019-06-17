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

import { InternalCoreSetup, InternalCoreStart } from '.';
import { ChromeService } from './chrome';
import { FatalErrorsService, FatalErrorsSetup } from './fatal_errors';
import { HttpService } from './http';
import { I18nService } from './i18n';
import { InjectedMetadataParams, InjectedMetadataService } from './injected_metadata';
import { LegacyPlatformParams, LegacyPlatformService } from './legacy';
import { NotificationsService } from './notifications';
import { OverlayService } from './overlays';
import { PluginsService } from './plugins';
import { UiSettingsService } from './ui_settings';
import { ApplicationService } from './application';
import { mapToObject } from '../utils/';

interface Params {
  rootDomElement: HTMLElement;
  browserSupportsCsp: boolean;
  injectedMetadata: InjectedMetadataParams['injectedMetadata'];
  requireLegacyFiles: LegacyPlatformParams['requireLegacyFiles'];
  useLegacyTestHarness?: LegacyPlatformParams['useLegacyTestHarness'];
}

/** @internal */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface CoreContext {}

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
  private readonly legacyPlatform: LegacyPlatformService;
  private readonly notifications: NotificationsService;
  private readonly http: HttpService;
  private readonly uiSettings: UiSettingsService;
  private readonly chrome: ChromeService;
  private readonly i18n: I18nService;
  private readonly overlay: OverlayService;
  private readonly plugins: PluginsService;
  private readonly application: ApplicationService;

  private readonly rootDomElement: HTMLElement;
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
    this.uiSettings = new UiSettingsService();
    this.overlay = new OverlayService();
    this.application = new ApplicationService();
    this.chrome = new ChromeService({ browserSupportsCsp });

    const core: CoreContext = {};
    this.plugins = new PluginsService(core);

    this.legacyPlatform = new LegacyPlatformService({
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
      const http = this.http.setup({ injectedMetadata, fatalErrors: this.fatalErrorsSetup });
      const uiSettings = this.uiSettings.setup({ http, injectedMetadata });
      const notifications = this.notifications.setup({ uiSettings });
      const application = this.application.setup();

      const core: InternalCoreSetup = {
        application,
        fatalErrors: this.fatalErrorsSetup,
        http,
        injectedMetadata,
        notifications,
        uiSettings,
      };

      // Services that do not expose contracts at setup
      const plugins = await this.plugins.setup(core);
      await this.legacyPlatform.setup({ core, plugins: mapToObject(plugins.contracts) });

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
      const http = await this.http.start({ injectedMetadata, fatalErrors: this.fatalErrorsSetup });
      const i18n = await this.i18n.start();
      const application = await this.application.start({ injectedMetadata });

      const notificationsTargetDomElement = document.createElement('div');
      const overlayTargetDomElement = document.createElement('div');
      const legacyPlatformTargetDomElement = document.createElement('div');

      // ensure the rootDomElement is empty
      this.rootDomElement.textContent = '';
      this.rootDomElement.classList.add('coreSystemRootDomElement');
      this.rootDomElement.appendChild(notificationsTargetDomElement);
      this.rootDomElement.appendChild(legacyPlatformTargetDomElement);
      this.rootDomElement.appendChild(overlayTargetDomElement);

      const overlays = this.overlay.start({ i18n, targetDomElement: overlayTargetDomElement });
      const notifications = await this.notifications.start({
        i18n,
        overlays,
        targetDomElement: notificationsTargetDomElement,
      });
      const chrome = await this.chrome.start({
        application,
        http,
        injectedMetadata,
        notifications,
      });

      const core: InternalCoreStart = {
        application,
        chrome,
        http,
        i18n,
        injectedMetadata,
        notifications,
        overlays,
      };

      const plugins = await this.plugins.start(core);
      await this.legacyPlatform.start({
        core,
        plugins: mapToObject(plugins.contracts),
        targetDomElement: legacyPlatformTargetDomElement,
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
    this.legacyPlatform.stop();
    this.plugins.stop();
    this.notifications.stop();
    this.http.stop();
    this.uiSettings.stop();
    this.chrome.stop();
    this.i18n.stop();
    this.rootDomElement.textContent = '';
  }
}
