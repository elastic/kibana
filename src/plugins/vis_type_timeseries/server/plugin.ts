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
} from 'src/core/server';
import { Observable } from 'rxjs';
import { Server } from 'hapi';
import { once } from 'lodash';
import { VisTypeTimeseriesConfig } from '.';
import {
  init,
  getVisData,
  GetVisData,
  GetVisDataOptions,
} from '../../../legacy/core_plugins/vis_type_timeseries/server';
import {
  ValidationTelemetryService,
} from './validation_telemetry/validation_telemetry_service';
import { UsageCollectionSetup } from '../../usage_collection/server';

export interface LegacySetup {
  server: Server;
}

interface VisTypeTimeseriesPluginSetupDependencies {
  usageCollection?: UsageCollectionSetup;
}

export interface VisTypeTimeseriesSetup {
  /** @deprecated */
  __legacy: {
    config$: Observable<VisTypeTimeseriesConfig>;
    registerLegacyAPI: (__LEGACY: LegacySetup) => void;
  };
  getVisData: (
    requestContext: RequestHandlerContext,
    options: GetVisDataOptions
  ) => ReturnType<GetVisData>;
}

export interface Framework {
  core: CoreSetup;
  plugins: any;
  config$: Observable<VisTypeTimeseriesConfig>;
  globalConfig$: PluginInitializerContext['config']['legacy']['globalConfig$'];
  logger: Logger;
}

export class VisTypeTimeseriesPlugin implements Plugin<VisTypeTimeseriesSetup> {
  private validationTelementryService: ValidationTelemetryService;

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.initializerContext = initializerContext;
    this.validationTelementryService = new ValidationTelemetryService();
  }

  public setup(core: CoreSetup, plugins: VisTypeTimeseriesPluginSetupDependencies) {
    const logger = this.initializerContext.logger.get('visTypeTimeseries');
    const config$ = this.initializerContext.config.create<VisTypeTimeseriesConfig>();
    // Global config contains things like the ES shard timeout
    const globalConfig$ = this.initializerContext.config.legacy.globalConfig$;


    const framework: Framework = {
      core,
      plugins,
      config$,
      globalConfig$,
      logger,
    };

    return {
      __legacy: {
        config$,
        registerLegacyAPI: once(async (__LEGACY: LegacySetup) => {
          const validationTelemetrySetup = await this.validationTelementryService.setup(core, {
            ...plugins,
            globalConfig$,
          });

          await init(framework, __LEGACY, validationTelemetrySetup);
        }),
      },
      getVisData: async (requestContext: RequestHandlerContext, options: GetVisDataOptions) => {
        return await getVisData(requestContext, options, framework);
      },
    };
  }

  public start(core: CoreStart) {}
}
