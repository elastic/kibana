/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
import { Server } from 'hapi';
import { VisTypeTimeseriesConfig } from './config';
import { getVisData, GetVisData, GetVisDataOptions } from './lib/get_vis_data';
import { ValidationTelemetryService } from './validation_telemetry';
import { UsageCollectionSetup } from '../../usage_collection/server';
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

export interface VisTypeTimeseriesSetup {
  getVisData: (
    requestContext: RequestHandlerContext,
    fakeRequest: FakeRequest,
    options: GetVisDataOptions
  ) => ReturnType<GetVisData>;
  addSearchStrategy: SearchStrategyRegistry['addStrategy'];
}

export interface Framework {
  core: CoreSetup;
  plugins: any;
  config$: Observable<VisTypeTimeseriesConfig>;
  globalConfig$: PluginInitializerContext['config']['legacy']['globalConfig$'];
  logger: Logger;
  router: IRouter;
  searchStrategyRegistry: SearchStrategyRegistry;
}

export class VisTypeTimeseriesPlugin implements Plugin<VisTypeTimeseriesSetup> {
  private validationTelementryService: ValidationTelemetryService;

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.initializerContext = initializerContext;
    this.validationTelementryService = new ValidationTelemetryService();
  }

  public setup(core: CoreSetup, plugins: VisTypeTimeseriesPluginSetupDependencies) {
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

    (async () => {
      const validationTelemetry = await this.validationTelementryService.setup(core, {
        ...plugins,
        globalConfig$,
      });
      visDataRoutes(router, framework, validationTelemetry);

      fieldsRoutes(framework);
    })();

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
