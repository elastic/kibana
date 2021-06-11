/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { CoreSetup, Plugin, UiSettingsParams } from 'kibana/server';
import { getUiSettingsConfig } from './ui_settings';

export class ExpressionRevealImageServerPlugin implements Plugin<object, object> {
  public setup(core: CoreSetup) {
    core.uiSettings.register(getUiSettingsConfig());
    return {};
  }

  public start() {
    return {};
  }
}
