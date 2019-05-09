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

import angular from 'angular';
import { CoreSetup, CoreStart } from '../';

/** @internal */
export interface LegacyPlatformParams {
  requireLegacyFiles: () => void;
  useLegacyTestHarness?: boolean;
}

interface SetupDeps {
  core: CoreSetup;
}

interface StartDeps {
  core: CoreStart;
  targetDomElement: HTMLElement;
}

interface BootstrapModule {
  bootstrap: (targetDomElement: HTMLElement) => void;
}

/**
 * The LegacyPlatformService is responsible for initializing
 * the legacy platform by injecting parts of the new platform
 * services into the legacy platform modules, like ui/modules,
 * and then bootstrapping the ui/chrome or ui/test_harness to
 * setup either the app or browser tests.
 */
export class LegacyPlatformService {
  private bootstrapModule?: BootstrapModule;
  private targetDomElement?: HTMLElement;

  constructor(private readonly params: LegacyPlatformParams) {}

  public setup({ core }: SetupDeps) {
    const {
      application,
      i18n,
      injectedMetadata,
      fatalErrors,
      notifications,
      http,
      basePath,
      uiSettings,
      chrome,
    } = core;
    // Inject parts of the new platform into parts of the legacy platform
    // so that legacy APIs/modules can mimic their new platform counterparts
    require('ui/new_platform').__newPlatformSetup__(core);
    require('ui/metadata').__newPlatformSetup__(injectedMetadata.getLegacyMetadata());
    require('ui/i18n').__newPlatformSetup__(i18n.Context);
    require('ui/notify/fatal_error').__newPlatformSetup__(fatalErrors);
    require('ui/kfetch').__newPlatformSetup__(http);
    require('ui/notify/toasts').__newPlatformSetup__(notifications.toasts);
    require('ui/chrome/api/loading_count').__newPlatformSetup__(http);
    require('ui/chrome/api/base_path').__newPlatformSetup__(basePath);
    require('ui/chrome/api/ui_settings').__newPlatformSetup__(uiSettings);
    require('ui/chrome/api/injected_vars').__newPlatformSetup__(injectedMetadata);
    require('ui/chrome/api/controls').__newPlatformSetup__(chrome);
    require('ui/chrome/api/help_extension').__newPlatformSetup__(chrome);
    require('ui/chrome/api/theme').__newPlatformSetup__(chrome);
    require('ui/chrome/api/badge').__newPlatformSetup__(chrome);
    require('ui/chrome/api/breadcrumbs').__newPlatformSetup__(chrome);
    require('ui/chrome/services/global_nav_state').__newPlatformSetup__(chrome);

    injectedMetadata.getLegacyMetadata().nav.forEach((navLink: any) =>
      application.registerLegacyApp({
        id: navLink.id,
        order: navLink.order,
        title: navLink.title,
        euiIconType: navLink.euiIconType,
        icon: navLink.icon,
        appUrl: navLink.url,
      })
    );

    // Load the bootstrap module before loading the legacy platform files so that
    // the bootstrap module can modify the environment a bit first
    this.bootstrapModule = this.loadBootstrapModule();

    // require the files that will tie into the legacy platform
    this.params.requireLegacyFiles();
  }

  public start({ core, targetDomElement }: StartDeps) {
    if (!this.bootstrapModule) {
      throw new Error('Bootstrap module must be loaded before `start`');
    }

    this.targetDomElement = targetDomElement;

    require('ui/new_platform').__newPlatformStart__(core);
    require('ui/capabilities').__newPlatformStart__(core.application.capabilities);

    this.bootstrapModule.bootstrap(this.targetDomElement);
  }

  public stop() {
    if (!this.targetDomElement) {
      return;
    }

    const angularRoot = angular.element(this.targetDomElement);
    const injector$ = angularRoot.injector();

    // if we haven't gotten to the point of bootstraping
    // angular, injector$ won't be defined
    if (!injector$) {
      return;
    }

    // destroy the root angular scope
    injector$.get('$rootScope').$destroy();

    // clear the inner html of the root angular element
    this.targetDomElement.textContent = '';
  }

  private loadBootstrapModule(): BootstrapModule {
    if (this.params.useLegacyTestHarness) {
      // wrapped in NODE_ENV check so the `ui/test_harness` module
      // is not included in the distributable
      if (process.env.IS_KIBANA_DISTRIBUTABLE !== 'true') {
        return require('ui/test_harness');
      }

      throw new Error('tests bundle is not available in the distributable');
    }

    return require('ui/chrome');
  }
}
