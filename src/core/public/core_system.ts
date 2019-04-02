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

import { BasePathService } from './base_path';
import { ChromeService } from './chrome';
import { FatalErrorsService } from './fatal_errors';
import { HttpService } from './http';
import { I18nService } from './i18n';
import { InjectedMetadataParams, InjectedMetadataService } from './injected_metadata';
import { LegacyPlatformParams, LegacyPlatformService } from './legacy';
import { NotificationsService } from './notifications';
import { UiSettingsService } from './ui_settings';

interface Params {
  rootDomElement: HTMLElement;
  browserSupportsCsp: boolean;
  injectedMetadata: InjectedMetadataParams['injectedMetadata'];
  requireLegacyFiles: LegacyPlatformParams['requireLegacyFiles'];
  useLegacyTestHarness?: LegacyPlatformParams['useLegacyTestHarness'];
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
  private readonly legacyPlatform: LegacyPlatformService;
  private readonly notifications: NotificationsService;
  private readonly http: HttpService;
  private readonly uiSettings: UiSettingsService;
  private readonly basePath: BasePathService;
  private readonly chrome: ChromeService;
  private readonly i18n: I18nService;

  private readonly rootDomElement: HTMLElement;
  private readonly notificationsTargetDomElement: HTMLDivElement;
  private readonly legacyPlatformTargetDomElement: HTMLDivElement;

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

    this.fatalErrors = new FatalErrorsService({
      rootDomElement,
      injectedMetadata: this.injectedMetadata,
      stopCoreSystem: () => {
        this.stop();
      },
    });

    this.notificationsTargetDomElement = document.createElement('div');
    this.notifications = new NotificationsService({
      targetDomElement: this.notificationsTargetDomElement,
    });
    this.http = new HttpService();
    this.basePath = new BasePathService();
    this.uiSettings = new UiSettingsService();
    this.chrome = new ChromeService({ browserSupportsCsp });

    this.legacyPlatformTargetDomElement = document.createElement('div');
    this.legacyPlatform = new LegacyPlatformService({
      targetDomElement: this.legacyPlatformTargetDomElement,
      requireLegacyFiles,
      useLegacyTestHarness,
    });
  }

  public setup() {
    try {
      // ensure the rootDomElement is empty
      this.rootDomElement.textContent = '';
      this.rootDomElement.classList.add('coreSystemRootDomElement');
      this.rootDomElement.appendChild(this.notificationsTargetDomElement);
      this.rootDomElement.appendChild(this.legacyPlatformTargetDomElement);

      const i18n = this.i18n.setup();
      const notifications = this.notifications.setup({ i18n });
      const injectedMetadata = this.injectedMetadata.setup();
      const fatalErrors = this.fatalErrors.setup({ i18n });
      const http = this.http.setup({ fatalErrors });
      const basePath = this.basePath.setup({ injectedMetadata });
      const uiSettings = this.uiSettings.setup({
        notifications,
        http,
        injectedMetadata,
        basePath,
      });
      const chrome = this.chrome.setup({
        injectedMetadata,
        notifications,
      });

      this.legacyPlatform.setup({
        i18n,
        injectedMetadata,
        fatalErrors,
        notifications,
        http,
        basePath,
        uiSettings,
        chrome,
      });

      return { fatalErrors };
    } catch (error) {
      this.fatalErrors.add(error);
    }
  }

  public stop() {
    this.legacyPlatform.stop();
    this.notifications.stop();
    this.http.stop();
    this.uiSettings.stop();
    this.chrome.stop();
    this.i18n.stop();
    this.rootDomElement.textContent = '';
  }
}
