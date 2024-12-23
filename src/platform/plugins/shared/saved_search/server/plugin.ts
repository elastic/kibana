/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/server';
import { StartServicesAccessor } from '@kbn/core/server';
import type {
  PluginSetup as DataPluginSetup,
  PluginStart as DataPluginStart,
} from '@kbn/data-plugin/server';
import type { ContentManagementServerSetup } from '@kbn/content-management-plugin/server';
import { ExpressionsServerSetup } from '@kbn/expressions-plugin/server';
import { getSavedSearchObjectType } from './saved_objects';
import { SavedSearchType, LATEST_VERSION } from '../common';
import { SavedSearchStorage } from './content_management';
import { kibanaContext } from '../common/expressions';
import { getKibanaContext } from './expressions/kibana_context';
import { getSavedSearch } from '../common/service/get_saved_searches';

/**
 * Saved search plugin server Setup contract
 */
export interface SavedSearchPublicSetupDependencies {
  data: DataPluginSetup;
  contentManagement: ContentManagementServerSetup;
  expressions: ExpressionsServerSetup;
}

export interface SavedSearchServerStartDeps {
  data: DataPluginStart;
}

export class SavedSearchServerPlugin
  implements Plugin<object, object, object, SavedSearchServerStartDeps>
{
  constructor(private initializerContext: PluginInitializerContext) {}

  public setup(
    core: CoreSetup,
    { data, contentManagement, expressions }: SavedSearchPublicSetupDependencies
  ) {
    contentManagement.register({
      id: SavedSearchType,
      storage: new SavedSearchStorage({
        throwOnResultValidationError: this.initializerContext.env.mode.dev,
        logger: this.initializerContext.logger.get('storage'),
      }),
      version: {
        latest: LATEST_VERSION,
      },
    });

    const searchSource = data.search.searchSource;

    const getSearchSourceMigrations = searchSource.getAllMigrations.bind(searchSource);
    core.savedObjects.registerType(getSavedSearchObjectType(getSearchSourceMigrations));

    expressions.registerType(kibanaContext);
    expressions.registerFunction(
      getKibanaContext(core.getStartServices as StartServicesAccessor<SavedSearchServerStartDeps>)
    );

    return {};
  }

  public start(core: CoreStart) {
    return {
      getSavedSearch,
    };
  }

  public stop() {}
}
