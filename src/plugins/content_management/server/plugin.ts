/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/server';
import {
  ContentManagementServerSetup,
  ContentManagementServerStart,
  SetupDependencies,
} from './types';

export class ContentManagementPlugin
  implements Plugin<ContentManagementServerSetup, ContentManagementServerStart, SetupDependencies>
{
  constructor(initializerContext: PluginInitializerContext) {}

  public setup(core: CoreSetup) {
    return {};
  }

  public start(core: CoreStart) {
    return {};
  }
}
