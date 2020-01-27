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
import { first } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { InternalCoreSetup, InternalCoreStart } from '../core_system';
import { LegacyCoreSetup, LegacyCoreStart, MountPoint } from '../';

/** @internal */
export interface LegacyPlatformParams {
  requireLegacyFiles: () => void;
  useLegacyTestHarness?: boolean;
}

interface SetupDeps {
  core: InternalCoreSetup;
  plugins: Record<string, unknown>;
}

interface StartDeps {
  core: InternalCoreStart;
  plugins: Record<string, unknown>;
  lastSubUrlStorage?: Storage;
  targetDomElement?: HTMLElement;
}

interface BootstrapModule {
  bootstrap: MountPoint;
}

/**
 * The LegacyPlatformService is responsible for initializing
 * the legacy platform by injecting parts of the new platform
 * services into the legacy platform modules, like ui/modules,
 * and then bootstrapping the ui/chrome or ui/test_harness to
 * setup either the app or browser tests.
 */
export class LegacyPlatformService {
  /** Symbol to represent the legacy platform as a fake "plugin". Used by the ContextService */
  public readonly legacyId = Symbol();
  private bootstrapModule?: BootstrapModule;
  private targetDomElement?: HTMLElement;
  private readonly startDependencies$ = new Subject<[LegacyCoreStart, object]>();
  private readonly startDependencies = this.startDependencies$.pipe(first()).toPromise();

  constructor(private readonly params: LegacyPlatformParams) {}

  public setup({ core, plugins }: SetupDeps) {
    // Always register legacy apps, even if not in legacy mode.
    core.injectedMetadata.getLegacyMetadata().nav.forEach((navLink: any) =>
      core.application.registerLegacyApp({
        id: navLink.id,
        order: navLink.order,
        title: navLink.title,
        euiIconType: navLink.euiIconType,
        icon: navLink.icon,
        appUrl: navLink.url,
        subUrlBase: navLink.subUrlBase,
        linkToLastSubUrl: navLink.linkToLastSubUrl,
      })
    );

    const legacyCore: LegacyCoreSetup = {
      ...core,
      getStartServices: () => this.startDependencies,
      application: {
        register: notSupported(`core.application.register()`),
        registerMountContext: notSupported(`core.application.registerMountContext()`),
      },
    };

    // Inject parts of the new platform into parts of the legacy platform
    // so that legacy APIs/modules can mimic their new platform counterparts
    if (core.injectedMetadata.getLegacyMode()) {
      require('ui/new_platform').__setup__(legacyCore, plugins);
    }
  }

  public start({
    core,
    targetDomElement,
    plugins,
    lastSubUrlStorage = window.sessionStorage,
  }: StartDeps) {
    // Initialize legacy sub urls
    core.chrome.navLinks
      .getAll()
      .filter(link => link.legacy)
      .forEach(navLink => {
        const lastSubUrl = lastSubUrlStorage.getItem(`lastSubUrl:${navLink.baseUrl}`);
        core.chrome.navLinks.update(navLink.id, {
          url: lastSubUrl || navLink.url || navLink.baseUrl,
        });
      });

    // Only import and bootstrap legacy platform if we're in legacy mode.
    if (!core.injectedMetadata.getLegacyMode()) {
      return;
    }

    const legacyCore: LegacyCoreStart = {
      ...core,
      application: {
        capabilities: core.application.capabilities,
        getUrlForApp: core.application.getUrlForApp,
        navigateToApp: core.application.navigateToApp,
        registerMountContext: notSupported(`core.application.registerMountContext()`),
      },
    };

    this.startDependencies$.next([legacyCore, plugins]);

    // Inject parts of the new platform into parts of the legacy platform
    // so that legacy APIs/modules can mimic their new platform counterparts
    require('ui/new_platform').__start__(legacyCore, plugins);

    // Load the bootstrap module before loading the legacy platform files so that
    // the bootstrap module can modify the environment a bit first
    this.bootstrapModule = this.loadBootstrapModule();

    // require the files that will tie into the legacy platform
    this.params.requireLegacyFiles();

    if (!this.bootstrapModule) {
      throw new Error('Bootstrap module must be loaded before `start`');
    }

    this.targetDomElement = targetDomElement;

    // `targetDomElement` is always defined when in legacy mode
    this.bootstrapModule.bootstrap(this.targetDomElement!);
  }

  public stop() {
    if (!this.targetDomElement) {
      return;
    }

    const angularRoot = angular.element(this.targetDomElement);
    const injector$ = angularRoot.injector();

    // if we haven't gotten to the point of bootstrapping
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

const notSupported = (methodName: string) => (...args: any[]) => {
  throw new Error(`${methodName} is not supported in the legacy platform.`);
};
