/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { PluginInitializerContext, Plugin, CoreSetup } from '@kbn/core/server';

import { uiSettings } from './ui_settings';
export class DevToolsServerPlugin implements Plugin<object, object> {
  constructor(initializerContext: PluginInitializerContext) {}

  public setup(core: CoreSetup<object>) {
    /**
     * Register Dev Tools UI Settings
     */
    core.uiSettings.register(uiSettings);
    return {};
  }

  public start() {
    return {};
  }

  public stop() {}
}
