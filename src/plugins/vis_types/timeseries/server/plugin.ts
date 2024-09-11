/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  Plugin,
  Logger,
  KibanaRequest,
  IUiSettingsClient,
} from '@kbn/core/server';
import { firstValueFrom, Observable } from 'rxjs';
import { Server } from '@hapi/hapi';
import { map } from 'rxjs';
import { HomeServerPluginSetup } from '@kbn/home-plugin/server';
import { PluginStart } from '@kbn/data-plugin/server';
import type { DataViewsService } from '@kbn/data-views-plugin/common';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/server';
import type { PluginStart as DataViewsPublicPluginStart } from '@kbn/data-views-plugin/server';
import type { FieldFormatsRegistry } from '@kbn/field-formats-plugin/common';
import type { VisualizationsServerSetup } from '@kbn/visualizations-plugin/server';
import { VIS_TYPE } from '../common/constants';
import { VisTypeTimeseriesConfig } from './config';
import { getVisData } from './lib/get_vis_data';
import { visDataRoutes } from './routes/vis';
import { fieldsRoutes } from './routes/fields';
import { getUiSettings } from './ui_settings';
import type {
  VisTypeTimeseriesRequestHandlerContext,
  VisTypeTimeseriesVisDataRequest,
} from './types';

import {
  SearchStrategyRegistry,
  DefaultSearchStrategy,
  RollupSearchStrategy,
} from './lib/search_strategies';
import type { TimeseriesVisData, VisPayload } from '../common/types';

export interface LegacySetup {
  server: Server;
}

interface VisTypeTimeseriesPluginSetupDependencies {
  home?: HomeServerPluginSetup;
  visualizations: VisualizationsServerSetup;
}

interface VisTypeTimeseriesPluginStartDependencies {
  data: PluginStart;
  fieldFormats: FieldFormatsStart;
  dataViews: DataViewsPublicPluginStart;
}

export interface VisTypeTimeseriesSetup {
  getVisData: (
    requestContext: VisTypeTimeseriesRequestHandlerContext,
    fakeRequest: KibanaRequest,
    // ideally this should be VisPayload type, but currently has inconsistencies with x-pack/plugins/observability_solution/infra/server/lib/adapters/framework/kibana_framework_adapter.ts
    options: any
  ) => Promise<TimeseriesVisData>;
}

export interface Framework {
  core: CoreSetup<VisTypeTimeseriesPluginStartDependencies>;
  plugins: any;
  config$: Observable<VisTypeTimeseriesConfig>;
  globalConfig$: PluginInitializerContext['config']['legacy']['globalConfig$'];
  logger: Logger;
  searchStrategyRegistry: SearchStrategyRegistry;
  getIndexPatternsService: (
    requestContext: VisTypeTimeseriesRequestHandlerContext
  ) => Promise<DataViewsService>;
  getFieldFormatsService: (uiSettings: IUiSettingsClient) => Promise<FieldFormatsRegistry>;
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
    core.uiSettings.register(getUiSettings());
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
      searchStrategyRegistry,
      getEsShardTimeout: () =>
        firstValueFrom(
          globalConfig$.pipe(map((config) => config.elasticsearch.shardTimeout.asMilliseconds()))
        ),
      getIndexPatternsService: async (requestContext) => {
        const [, { dataViews }] = await core.getStartServices();
        const { elasticsearch, savedObjects } = await requestContext.core;
        return await dataViews.dataViewsServiceFactory(
          savedObjects.client,
          elasticsearch.client.asCurrentUser
        );
      },
      getFieldFormatsService: async (uiSettings) => {
        const [, { fieldFormats }] = await core.getStartServices();

        return fieldFormats.fieldFormatServiceFactory(uiSettings);
      },
    };

    searchStrategyRegistry.addStrategy(new DefaultSearchStrategy());
    searchStrategyRegistry.addStrategy(new RollupSearchStrategy());

    visDataRoutes(router, framework);
    fieldsRoutes(router, framework);

    const { readOnly } = this.initializerContext.config.get<VisTypeTimeseriesConfig>();
    if (readOnly) {
      plugins.visualizations.registerReadOnlyVisType(VIS_TYPE);
    }

    return {
      getVisData: async (
        requestContext: VisTypeTimeseriesRequestHandlerContext,
        fakeRequest: KibanaRequest,
        options: VisPayload
      ) => {
        return await getVisData(
          requestContext,
          { ...fakeRequest, body: options } as VisTypeTimeseriesVisDataRequest,
          framework
        );
      },
    };
  }

  public start(core: CoreStart) {}
}
