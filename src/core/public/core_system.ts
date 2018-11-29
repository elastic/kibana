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
import { InjectedMetadataParams, InjectedMetadataService } from './injected_metadata';
import { LegacyPlatformParams, LegacyPlatformService } from './legacy_platform';
import { LoadingCountService } from './loading_count';
import { NotificationsService } from './notifications';
import { UiSettingsService } from './ui_settings';

interface Params {
  rootDomElement: HTMLElement;
  injectedMetadata: InjectedMetadataParams['injectedMetadata'];
  requireLegacyFiles: LegacyPlatformParams['requireLegacyFiles'];
  useLegacyTestHarness?: LegacyPlatformParams['useLegacyTestHarness'];
}

/**
 * The CoreSystem is the root of the new platform, and starts all parts
 * of Kibana in the UI, including the LegacyPlatform which is managed
 * by the LegacyPlatformService. As we migrate more things to the new
 * platform the CoreSystem will get many more Services.
 */
export class CoreSystem {
  private readonly fatalErrors: FatalErrorsService;
  private readonly injectedMetadata: InjectedMetadataService;
  private readonly legacyPlatform: LegacyPlatformService;
  private readonly notifications: NotificationsService;
  private readonly loadingCount: LoadingCountService;
  private readonly uiSettings: UiSettingsService;
  private readonly basePath: BasePathService;
  private readonly chrome: ChromeService;

  private readonly rootDomElement: HTMLElement;
  private readonly notificationsTargetDomElement: HTMLDivElement;
  private readonly legacyPlatformTargetDomElement: HTMLDivElement;

  constructor(params: Params) {
    const { rootDomElement, injectedMetadata, requireLegacyFiles, useLegacyTestHarness } = params;

    this.rootDomElement = rootDomElement;

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

    this.loadingCount = new LoadingCountService();
    this.basePath = new BasePathService();
    this.uiSettings = new UiSettingsService();
    this.chrome = new ChromeService();

    this.legacyPlatformTargetDomElement = document.createElement('div');
    this.legacyPlatform = new LegacyPlatformService({
      targetDomElement: this.legacyPlatformTargetDomElement,
      requireLegacyFiles,
      useLegacyTestHarness,
    });
  }

  public start() {
    try {
      // ensure the rootDomElement is empty
      this.rootDomElement.textContent = '';
      this.rootDomElement.classList.add('coreSystemRootDomElement');
      this.rootDomElement.appendChild(this.notificationsTargetDomElement);
      this.rootDomElement.appendChild(this.legacyPlatformTargetDomElement);

      const notifications = this.notifications.start();
      const injectedMetadata = this.injectedMetadata.start();
      const fatalErrors = this.fatalErrors.start();
      const loadingCount = this.loadingCount.start({ fatalErrors });
      const basePath = this.basePath.start({ injectedMetadata });
      const uiSettings = this.uiSettings.start({
        notifications,
        loadingCount,
        injectedMetadata,
        basePath,
      });
      const chrome = this.chrome.start();

      this.legacyPlatform.start({
        injectedMetadata,
        fatalErrors,
        notifications,
        loadingCount,
        basePath,
        uiSettings,
        chrome,
      });
    } catch (error) {
      this.fatalErrors.add(error);
    }
  }

  public stop() {
    this.legacyPlatform.stop();
    this.notifications.stop();
    this.loadingCount.stop();
    this.uiSettings.stop();
    this.chrome.stop();
    this.rootDomElement.textContent = '';
  }
}
