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
import type { ICPSManager } from '@kbn/cps-utils';
import type { CPSPluginSetup, CPSPluginStart, CPSConfigType } from './types';
import { CPSManager } from './services/cps_manager';

export class CpsPlugin implements Plugin<CPSPluginSetup, CPSPluginStart> {
  private readonly initializerContext: PluginInitializerContext<CPSConfigType>;

  constructor(initializerContext: PluginInitializerContext<CPSConfigType>) {
    this.initializerContext = initializerContext;
  }

  public setup(core: CoreSetup): CPSPluginSetup {
    const { cpsEnabled } = this.initializerContext.config.get();

    return {
      cpsEnabled,
    };
  }

  public start(core: CoreStart): CPSPluginStart {
    const { cpsEnabled } = this.initializerContext.config.get();
    let cpsManager: ICPSManager | undefined;

    // Only initialize cpsManager in serverless environments when CPS is enabled
    if (cpsEnabled) {
      const manager = new CPSManager({
        http: core.http,
        logger: this.initializerContext.logger.get('cps'),
      });

      // Register project picker in the navigation
      import('@kbn/cps-utils').then(({ ProjectPicker }) => {
        core.chrome.navControls.registerLeft({
          mount: (element) => {
            ReactDOM.render(
              <I18nProvider>
                <ProjectPicker cpsManager={manager} />
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
      });
      cpsManager = manager;
    }

    return {
      cpsManager,
    };
  }

  public stop() {}
}
