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

import { CoreSetup, CoreStart } from '.';
import { BasePathService } from './base_path';
import { CapabilitiesService } from './capabilities';
import { ChromeService } from './chrome';
import { FatalErrorsService } from './fatal_errors';
import { HttpService } from './http';
import { I18nService } from './i18n';
import { InjectedMetadataParams, InjectedMetadataService } from './injected_metadata';
import { LegacyPlatformParams, LegacyPlatformService } from './legacy';
import { NotificationsService } from './notifications';
import { OverlayService } from './overlays';
import { PluginsService } from './plugins';
import { UiSettingsService } from './ui_settings';

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
  private readonly basePath: BasePathService;
  private readonly chrome: ChromeService;
  private readonly i18n: I18nService;
  private readonly capabilities: CapabilitiesService;
  private readonly overlay: OverlayService;
  private readonly plugins: PluginsService;

  private readonly rootDomElement: HTMLElement;
  private readonly overlayTargetDomElement: HTMLDivElement;

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

    this.capabilities = new CapabilitiesService();

    this.injectedMetadata = new InjectedMetadataService({
      injectedMetadata,
    });

    this.fatalErrors = new FatalErrorsService({
      rootDomElement,
      injectedMetadata: this.injectedMetadata,
      stopCoreSystem: () => {
        this.stop();
      },
    });

    this.notifications = new NotificationsService();
    this.http = new HttpService();
    this.basePath = new BasePathService();
    this.uiSettings = new UiSettingsService();
    this.overlayTargetDomElement = document.createElement('div');
    this.overlay = new OverlayService(this.overlayTargetDomElement);
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
      const i18n = this.i18n.setup();
      const injectedMetadata = this.injectedMetadata.setup();
      const fatalErrors = this.fatalErrors.setup({ i18n });
      const http = this.http.setup({ fatalErrors });
      const basePath = this.basePath.setup({ injectedMetadata });
      const uiSettings = this.uiSettings.setup({
        http,
        injectedMetadata,
        basePath,
      });
      const notifications = this.notifications.setup({ uiSettings });
      const chrome = this.chrome.setup({
        injectedMetadata,
        notifications,
      });

      const core: CoreSetup = {
        basePath,
        chrome,
        fatalErrors,
        http,
        i18n,
        injectedMetadata,
        notifications,
        uiSettings,
      };

      // Services that do not expose contracts at setup
      await this.plugins.setup(core);
      await this.legacyPlatform.setup({ core });

      return { fatalErrors };
    } catch (error) {
      this.fatalErrors.add(error);
    }
  }

  public async start() {
    try {
      // ensure the rootDomElement is empty
      this.rootDomElement.textContent = '';
      this.rootDomElement.classList.add('coreSystemRootDomElement');

      const notificationsTargetDomElement = document.createElement('div');
      const legacyPlatformTargetDomElement = document.createElement('div');
      this.rootDomElement.appendChild(notificationsTargetDomElement);
      this.rootDomElement.appendChild(legacyPlatformTargetDomElement);
      this.rootDomElement.appendChild(this.overlayTargetDomElement);

      const injectedMetadata = this.injectedMetadata.start();
      const i18n = this.i18n.start();
      const capabilities = this.capabilities.start({ injectedMetadata });
      const notifications = this.notifications.start({
        i18n,
        targetDomElement: notificationsTargetDomElement,
      });
      const overlays = this.overlay.start({ i18n });

      const core: CoreStart = {
        capabilities,
        i18n,
        injectedMetadata,
        notifications,
        overlays,
      };

      await this.plugins.start(core);
      await this.legacyPlatform.start({ core, targetDomElement: legacyPlatformTargetDomElement });
    } catch (error) {
      this.fatalErrors.add(error);
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
