/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreStart, CoreSetup } from 'kibana/public';
import { injectHeaderStyle } from './utils/inject_header_style';

export class KibanaLegacyPlugin {
  public setup(core: CoreSetup<{}, KibanaLegacyStart>) {
    return {};
  }

  public start({ uiSettings }: CoreStart) {
    injectHeaderStyle(uiSettings);
    return {
      /**
       * Loads the font-awesome icon font. Should be removed once the last consumer has migrated to EUI
       * @deprecated
       */
      loadFontAwesome: async () => {
        await import('./font_awesome');
      },
    };
  }
}

export type KibanaLegacySetup = ReturnType<KibanaLegacyPlugin['setup']>;
export type KibanaLegacyStart = ReturnType<KibanaLegacyPlugin['start']>;
