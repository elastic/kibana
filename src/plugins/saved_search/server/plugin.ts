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
import { ExpressionsServerSetup } from '@kbn/expressions-plugin/server';
import { getSavedSearchObjectType } from './saved_objects';
import { SavedSearchType, LATEST_VERSION } from '../common';
import { SavedSearchStorage } from './content_management';
import { kibanaContext } from '../common/expressions';
import { getKibanaContext } from './expressions/kibana_context';

/**
 * Saved search plugin server Setup contract
 */
export interface SavedSearchPublicSetupDependencies {
  data: DataPluginSetup;
  contentManagement: ContentManagementServerSetup;
  expressions: ExpressionsServerSetup;
}

export class SavedSearchServerPlugin implements Plugin<object, object> {
  public setup(
    core: CoreSetup,
    { data, contentManagement, expressions }: SavedSearchPublicSetupDependencies
  ) {
    contentManagement.register({
      id: SavedSearchType,
      storage: new SavedSearchStorage(),
      version: {
        latest: LATEST_VERSION,
      },
    });

    const getSearchSourceMigrations = data.search.searchSource.getAllMigrations.bind(
      data.search.searchSource
    );
    core.savedObjects.registerType(getSavedSearchObjectType(getSearchSourceMigrations));

    expressions.registerType(kibanaContext);
    expressions.registerFunction(getKibanaContext({ getStartServices: core.getStartServices }));

    return {};
  }

  public start(core: CoreStart) {
    return {};
  }

  public stop() {}
}
