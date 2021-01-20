/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import {
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  Plugin,
  RequestHandlerContext,
  Logger,
  IRouter,
  FakeRequest,
} from 'src/core/server';
import { Observable } from 'rxjs';
import { Server } from '@hapi/hapi';
import { VisTypeTimeseriesConfig } from './config';
import { getVisData, GetVisData, GetVisDataOptions } from './lib/get_vis_data';
import { UsageCollectionSetup } from '../../usage_collection/server';
import { PluginStart } from '../../data/server';
import { visDataRoutes } from './routes/vis';
// @ts-ignore
import { fieldsRoutes } from './routes/fields';
import { SearchStrategyRegistry } from './lib/search_strategies';
import { uiSettings } from './ui_settings';

export interface LegacySetup {
  server: Server;
}

interface VisTypeTimeseriesPluginSetupDependencies {
  usageCollection?: UsageCollectionSetup;
}

interface VisTypeTimeseriesPluginStartDependencies {
  data: PluginStart;
}

export interface VisTypeTimeseriesSetup {
  getVisData: (
    requestContext: RequestHandlerContext,
    fakeRequest: FakeRequest,
    options: GetVisDataOptions
  ) => ReturnType<GetVisData>;
  addSearchStrategy: SearchStrategyRegistry['addStrategy'];
}

export interface Framework {
  core: CoreSetup<VisTypeTimeseriesPluginStartDependencies>;
  plugins: any;
  config$: Observable<VisTypeTimeseriesConfig>;
  globalConfig$: PluginInitializerContext['config']['legacy']['globalConfig$'];
  logger: Logger;
  router: IRouter;
  searchStrategyRegistry: SearchStrategyRegistry;
}

export class VisTypeTimeseriesPlugin implements Plugin<VisTypeTimeseriesSetup> {
  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.initializerContext = initializerContext;
  }

  public setup(
    core: CoreSetup<VisTypeTimeseriesPluginStartDependencies>,
    plugins: VisTypeTimeseriesPluginSetupDependencies
  ) {
    const logger = this.initializerContext.logger.get('visTypeTimeseries');
    core.uiSettings.register(uiSettings);
    const config$ = this.initializerContext.config.create<VisTypeTimeseriesConfig>();
    // Global config contains things like the ES shard timeout
    const globalConfig$ = this.initializerContext.config.legacy.globalConfig$;
    const router = core.http.createRouter();

    const searchStrategyRegistry = new SearchStrategyRegistry();

    const framework: Framework = {
      core,
      plugins,
      config$,
      globalConfig$,
      logger,
      router,
      searchStrategyRegistry,
    };

    visDataRoutes(router, framework);
    fieldsRoutes(framework);

    return {
      getVisData: async (
        requestContext: RequestHandlerContext,
        fakeRequest: FakeRequest,
        options: GetVisDataOptions
      ) => {
        return await getVisData(requestContext, { ...fakeRequest, body: options }, framework);
      },
      addSearchStrategy: searchStrategyRegistry.addStrategy.bind(searchStrategyRegistry),
    };
  }

  public start(core: CoreStart) {}
}
