/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PluginInitializerContext, CoreStart, CoreSetup } from 'kibana/public';
import { ConfigSchema } from '../config';
import { injectHeaderStyle } from './utils/inject_header_style';

export class KibanaLegacyPlugin {
  constructor(private readonly initializerContext: PluginInitializerContext<ConfigSchema>) {}

  public setup(core: CoreSetup<{}, KibanaLegacyStart>) {
    return {};
  }

  public start({ application, http: { basePath }, uiSettings }: CoreStart) {
    injectHeaderStyle(uiSettings);
    return {
      /**
       * Loads the font-awesome icon font. Should be removed once the last consumer has migrated to EUI
       * @deprecated
       */
      loadFontAwesome: async () => {
        await import('./font_awesome');
      },
      /**
       * Loads angular bootstrap modules. Should be removed once the last consumer has migrated to EUI
       * @deprecated
       */
      loadAngularBootstrap: async () => {
        const { initAngularBootstrap } = await import('./angular_bootstrap');
        initAngularBootstrap();
      },
      /**
       * @deprecated
       * Just exported for wiring up with dashboard mode, should not be used.
       */
      config: this.initializerContext.config.get(),
    };
  }
}

export type KibanaLegacySetup = ReturnType<KibanaLegacyPlugin['setup']>;
export type KibanaLegacyStart = ReturnType<KibanaLegacyPlugin['start']>;
