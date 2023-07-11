/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreSetup, CoreStart, Plugin } from '@kbn/core/server';
import type { PluginSetup as DataPluginSetup } from '@kbn/data-plugin/server';
import type { ContentManagementServerSetup } from '@kbn/content-management-plugin/server';
import { getSavedSearchObjectType } from './saved_objects';
import { SavedSearchType, LATEST_VERSION } from '../common';
import { SavedSearchStorage } from './content_management';

export class SavedSearchServerPlugin implements Plugin<object, object> {
  public setup(
    core: CoreSetup,
    plugins: {
      data: DataPluginSetup;
      contentManagement: ContentManagementServerSetup;
    }
  ) {
    plugins.contentManagement.register({
      id: SavedSearchType,
      storage: new SavedSearchStorage(),
      version: {
        latest: LATEST_VERSION,
      },
    });

    const getSearchSourceMigrations = plugins.data.search.searchSource.getAllMigrations.bind(
      plugins.data.search.searchSource
    );
    core.savedObjects.registerType(getSavedSearchObjectType(getSearchSourceMigrations));

    return {};
  }

  public start(core: CoreStart) {
    return {};
  }

  public stop() {}
}
