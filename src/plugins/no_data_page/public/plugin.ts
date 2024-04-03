/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import type { NoDataPagePublicSetup, NoDataPagePublicStart } from './types';
import type { NoDataPageConfig } from '../config';

export class NoDataPagePlugin implements Plugin<NoDataPagePublicSetup, NoDataPagePublicStart> {
  constructor(private initializerContext: PluginInitializerContext<NoDataPageConfig>) {}

  public setup(_core: CoreSetup): NoDataPagePublicSetup {
    return {
      getAnalyticsNoDataPageFlavor: () => {
        return this.initializerContext.config.get().analyticsNoDataPageFlavor;
      },
    };
  }

  public start(_core: CoreStart): NoDataPagePublicStart {
    return {
      getAnalyticsNoDataPageFlavor: () => {
        return this.initializerContext.config.get().analyticsNoDataPageFlavor;
      },
    };
  }
}
