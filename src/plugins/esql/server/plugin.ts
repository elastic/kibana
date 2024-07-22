/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { CoreSetup, CoreStart, Plugin } from '@kbn/core/server';
import { getUiSettings } from './ui_settings';

export class EsqlServerPlugin implements Plugin {
  public setup(core: CoreSetup) {
    core.uiSettings.register(getUiSettings());
    return {};
  }

  public start(core: CoreStart) {
    return {};
  }

  public stop() {}
}
