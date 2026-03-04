/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import ReactDOM from 'react-dom';
import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import { I18nProvider } from '@kbn/i18n-react';
import { type ICPSManager, type CPSAppAccessResolver } from '@kbn/cps-utils';
import type { CPSPluginSetup, CPSPluginStart, CPSConfigType } from './types';
import { CPSManager } from './services/cps_manager';

export class CpsPlugin implements Plugin<CPSPluginSetup, CPSPluginStart> {
  private readonly initializerContext: PluginInitializerContext<CPSConfigType>;
  private readonly appAccessResolvers = new Map<string, CPSAppAccessResolver>();

  constructor(initializerContext: PluginInitializerContext<CPSConfigType>) {
    this.initializerContext = initializerContext;
  }

  public setup(core: CoreSetup): CPSPluginSetup {
    const { cpsEnabled } = this.initializerContext.config.get();

    return {
      cpsEnabled,
      registerAppAccess: (appId: string, resolver: CPSAppAccessResolver) => {
        this.appAccessResolvers.set(appId, resolver);
      },
    };
  }

  public start(core: CoreStart): CPSPluginStart {
    const { cpsEnabled } = this.initializerContext.config.get();
    let cpsManager: ICPSManager | undefined;

    if (cpsEnabled) {
      const manager = new CPSManager({
        http: core.http,
        logger: this.initializerContext.logger.get('cps'),
        application: core.application,
        appAccessResolvers: this.appAccessResolvers,
      });

      // Register project picker only after the default project routing is known
      manager.whenReady().then(() =>
        import('@kbn/cps-utils').then(({ ProjectPickerContainer }) => {
          core.chrome.navControls.registerLeft({
            mount: (element) => {
              ReactDOM.render(
                <I18nProvider>
                  <ProjectPickerContainer cpsManager={manager} />
                </I18nProvider>,
                element,
                () => {}
              );

              return () => {
                ReactDOM.unmountComponentAtNode(element);
              };
            },
            order: 1000,
          });
        })
      );
      cpsManager = manager;
    }

    return {
      cpsManager,
    };
  }

  public stop() {}
}
