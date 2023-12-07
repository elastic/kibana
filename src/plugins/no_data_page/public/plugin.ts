/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type {
  CoreSetup,
  CoreStart,
  HttpSetup,
  Plugin,
  PluginInitializerContext,
} from '@kbn/core/public';
import type { NoDataPageConfig } from '../config';
import type { NoDataPagePluginSetup, NoDataPagePluginStart } from './types';
import { createUseHasApiKeys } from './lib/use_has_api_keys';

export class NoDataPagePlugin implements Plugin<NoDataPagePluginSetup> {
  constructor(private initializerContext: PluginInitializerContext<NoDataPageConfig>) {}

  public setup(core: CoreSetup): NoDataPagePluginSetup {
    return this.initialize(core);
  }

  public start(core: CoreStart): NoDataPagePluginStart {
    return this.initialize(core);
  }

  private initialize({ http }: { http: HttpSetup }): NoDataPagePluginSetup {
    return {
      getAnalyticsNoDataPageFlavor: () =>
        this.initializerContext.config.get().analyticsNoDataPageFlavor,
      useHasApiKeys: createUseHasApiKeys({ http }),
    };
  }
}
