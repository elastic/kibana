/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import { DiscoverSharedPluginSetup, DiscoverSharedPluginStart } from './types';

export class DiscoverSharedPlugin
  implements Plugin<DiscoverSharedPluginSetup, DiscoverSharedPluginStart>
{
  public setup(core: CoreSetup): DiscoverSharedPluginSetup {
    return {};
  }

  public start(core: CoreStart): DiscoverSharedPluginStart {
    return {};
  }

  public stop() {}
}
