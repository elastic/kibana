/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
import { first, map } from 'rxjs/operators';
import { VisTypeTimeseriesConfig } from './config';
import { getVisData } from './lib/get_vis_data';
import { UsageCollectionSetup } from '../../usage_collection/server';
import { PluginStart } from '../../data/server';
import { IndexPatternsService } from '../../data/common';
import { visDataRoutes } from './routes/vis';
import { fieldsRoutes } from './routes/fields';
import { uiSettings } from './ui_settings';
import type { VisTypeTimeseriesRequestHandlerContext, VisTypeTimeseriesRouter } from './types';

import {
  SearchStrategyRegistry,
  DefaultSearchStrategy,
  RollupSearchStrategy,
} from './lib/search_strategies';
import { TimeseriesVisData, VisPayload } from '../common/types';

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
    // ideally this should be VisPayload type, but currently has inconsistencies with x-pack/plugins/infra/server/lib/adapters/framework/kibana_framework_adapter.ts
    options: any
  ) => Promise<TimeseriesVisData>;
}

export interface Framework {
  core: CoreSetup<VisTypeTimeseriesPluginStartDependencies>;
  plugins: any;
  config$: Observable<VisTypeTimeseriesConfig>;
  globalConfig$: PluginInitializerContext['config']['legacy']['globalConfig$'];
  logger: Logger;
  router: VisTypeTimeseriesRouter;
  searchStrategyRegistry: SearchStrategyRegistry;
  getIndexPatternsService: (
    requestContext: VisTypeTimeseriesRequestHandlerContext
  ) => Promise<IndexPatternsService>;
  getEsShardTimeout: () => Promise<number>;
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
    const framework: Framework = {
      core,
      plugins,
      config$,
      globalConfig$,
      logger,
      router,
      searchStrategyRegistry,
      getEsShardTimeout: () =>
        globalConfig$
          .pipe(
            first(),
            map((config) => config.elasticsearch.shardTimeout.asMilliseconds())
          )
          .toPromise(),
      getIndexPatternsService: async (requestContext) => {
        const [, { data }] = await core.getStartServices();

        return await data.indexPatterns.indexPatternsServiceFactory(
          requestContext.core.savedObjects.client,
          requestContext.core.elasticsearch.client.asCurrentUser
        );
      },
    };

    searchStrategyRegistry.addStrategy(new DefaultSearchStrategy(framework));
    searchStrategyRegistry.addStrategy(new RollupSearchStrategy(framework));

    visDataRoutes(router, framework);
    fieldsRoutes(framework);

    return {
      getVisData: async (
        requestContext: VisTypeTimeseriesRequestHandlerContext,
        fakeRequest: FakeRequest,
        options: VisPayload
      ) => {
        return await getVisData(requestContext, { ...fakeRequest, body: options }, framework);
      },
    };
  }

  public start(core: CoreStart) {}
}
