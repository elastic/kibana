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
  Logger,
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
import { uiSettings } from './ui_settings';
import type { VisTypeTimeseriesRequestHandlerContext, VisTypeTimeseriesRouter } from './types';

import {
  SearchStrategyRegistry,
  DefaultSearchStrategy,
  RollupSearchStrategy,
} from './lib/search_strategies';

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
    requestContext: VisTypeTimeseriesRequestHandlerContext,
    fakeRequest: FakeRequest,
    options: GetVisDataOptions
  ) => ReturnType<GetVisData>;
}

export interface Framework {
  core: CoreSetup<VisTypeTimeseriesPluginStartDependencies>;
  plugins: any;
  config$: Observable<VisTypeTimeseriesConfig>;
  globalConfig$: PluginInitializerContext['config']['legacy']['globalConfig$'];
  logger: Logger;
  router: VisTypeTimeseriesRouter;
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
    const router = core.http.createRouter<VisTypeTimeseriesRequestHandlerContext>();

    const searchStrategyRegistry = new SearchStrategyRegistry();

    searchStrategyRegistry.addStrategy(new DefaultSearchStrategy());
    searchStrategyRegistry.addStrategy(new RollupSearchStrategy());

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
        requestContext: VisTypeTimeseriesRequestHandlerContext,
        fakeRequest: FakeRequest,
        options: GetVisDataOptions
      ) => {
        return await getVisData(requestContext, { ...fakeRequest, body: options }, framework);
      },
    };
  }

  public start(core: CoreStart) {}
}
