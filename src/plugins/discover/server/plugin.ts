/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreSetup, CoreStart, Plugin } from '@kbn/core/server';
import type { PluginSetup as DataPluginSetup } from '@kbn/data-plugin/server';
import { getUiSettings } from './ui_settings';
import { capabilitiesProvider } from './capabilities_provider';
import { getSavedSearchObjectType } from './saved_objects';

export class DiscoverServerPlugin implements Plugin<object, object> {
  public setup(
    core: CoreSetup,
    plugins: {
      data: DataPluginSetup;
    }
  ) {
    const getSearchSourceMigrations = plugins.data.search.searchSource.getAllMigrations.bind(
      plugins.data.search.searchSource
    );
    core.capabilities.registerProvider(capabilitiesProvider);
    core.uiSettings.register(getUiSettings(core.docLinks));
    core.savedObjects.registerType(getSavedSearchObjectType(getSearchSourceMigrations));

    return {};
  }

  public start(core: CoreStart) {
    return {};
  }

  public stop() {}
}
