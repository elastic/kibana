/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { CoreSetup, CoreStart, Plugin } from '../../../core/public';
import { pluginServices } from './services';
import { registry } from './services/kibana';
import {
  PresentationUtilPluginSetup,
  PresentationUtilPluginStart,
  PresentationUtilPluginSetupDeps,
  PresentationUtilPluginStartDeps,
} from './types';

export class PresentationUtilPlugin
  implements
    Plugin<
      PresentationUtilPluginSetup,
      PresentationUtilPluginStart,
      PresentationUtilPluginSetupDeps,
      PresentationUtilPluginStartDeps
    > {
  public setup(
    _coreSetup: CoreSetup<PresentationUtilPluginSetup>,
    _setupPlugins: PresentationUtilPluginSetupDeps
  ): PresentationUtilPluginSetup {
    return {};
  }

  public async start(
    coreStart: CoreStart,
    startPlugins: PresentationUtilPluginStartDeps
  ): Promise<PresentationUtilPluginStart> {
    pluginServices.setRegistry(registry.start({ coreStart, startPlugins }));

    return {
      ContextProvider: pluginServices.getContextProvider(),
    };
  }

  public stop() {}
}
