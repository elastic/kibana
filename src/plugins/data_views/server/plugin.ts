/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreSetup, CoreStart, Logger, Plugin, PluginInitializerContext } from 'src/core/server';
import { dataViewsServiceFactory } from './data_views_service_factory';
import { registerRoutes } from './routes';
import { dataViewSavedObjectType } from './saved_objects';
import { capabilitiesProvider } from './capabilities_provider';
import { getIndexPatternLoad } from './expressions';
import { registerIndexPatternsUsageCollector } from './register_index_pattern_usage_collection';
import { createScriptedFieldsDeprecationsConfig } from './deprecations';
import {
  DataViewsServerPluginSetup,
  DataViewsServerPluginStart,
  DataViewsServerPluginSetupDependencies,
  DataViewsServerPluginStartDependencies,
} from './types';

export class DataViewsServerPlugin
  implements
    Plugin<
      DataViewsServerPluginSetup,
      DataViewsServerPluginStart,
      DataViewsServerPluginSetupDependencies,
      DataViewsServerPluginStartDependencies
    >
{
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get('dataView');
  }

  public setup(
    core: CoreSetup<DataViewsServerPluginStartDependencies, DataViewsServerPluginStart>,
    { expressions, usageCollection }: DataViewsServerPluginSetupDependencies
  ) {
    core.savedObjects.registerType(dataViewSavedObjectType);
    core.capabilities.registerProvider(capabilitiesProvider);
    const dataViewRestCounter = usageCollection?.createUsageCounter('dataViewsRestApi');

    registerRoutes(core.http, core.getStartServices, dataViewRestCounter);

    expressions.registerFunction(getIndexPatternLoad({ getStartServices: core.getStartServices }));
    registerIndexPatternsUsageCollector(core.getStartServices, usageCollection);
    core.deprecations.registerDeprecations(createScriptedFieldsDeprecationsConfig(core));

    return {};
  }

  public start(
    { uiSettings, capabilities }: CoreStart,
    { fieldFormats }: DataViewsServerPluginStartDependencies
  ) {
    const serviceFactory = dataViewsServiceFactory({
      logger: this.logger.get('indexPatterns'),
      uiSettings,
      fieldFormats,
      capabilities,
    });

    return {
      indexPatternsServiceFactory: serviceFactory,
      dataViewsServiceFactory: serviceFactory,
    };
  }

  public stop() {}
}

export { DataViewsServerPlugin as Plugin };
