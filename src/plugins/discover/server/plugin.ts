/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreSetup, CoreStart, Plugin } from '@kbn/core/server';
import type { PluginSetup as DataPluginSetup } from '@kbn/data-plugin/server';
import type { HomeServerPluginSetup } from '@kbn/home-plugin/server';
import { getUiSettings } from './ui_settings';
import { capabilitiesProvider } from './capabilities_provider';
import { registerSampleData } from './sample_data';

export class DiscoverServerPlugin implements Plugin<object, object> {
  public setup(
    core: CoreSetup,
    plugins: {
      data: DataPluginSetup;
      home?: HomeServerPluginSetup;
    }
  ) {
    core.capabilities.registerProvider(capabilitiesProvider);
    core.uiSettings.register(getUiSettings(core.docLinks));

    if (plugins.home) {
      registerSampleData(plugins.home.sampleData);
    }

    return {};
  }

  public start(core: CoreStart) {
    return {};
  }

  public stop() {}
}
