/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import type { NoDataPagePluginSetup, NoDataPagePluginStart } from './types';
import type { NoDataPageConfig } from '../config';

export class NoDataPagePlugin implements Plugin<NoDataPagePluginSetup> {
  constructor(private initializerContext: PluginInitializerContext<NoDataPageConfig>) {}

  public setup(core: CoreSetup): NoDataPagePluginSetup {
    return {
      getAnalyticsNoDataPageFlavor: () => {
        return this.initializerContext.config.get().analyticsNoDataPageFlavor;
      },
    };
  }

  public start(core: CoreStart): NoDataPagePluginStart {
    return {
      getAnalyticsNoDataPageFlavor: () => {
        return this.initializerContext.config.get().analyticsNoDataPageFlavor;
      },
    };
  }
}
