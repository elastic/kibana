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

import { Legacy } from 'kibana';
import { PluginInitializerContext, CoreSetup } from 'kibana/server';

// @ts-ignore
import { fieldsRoutes } from './routes/fields';
// @ts-ignore
import { visDataRoutes } from './routes/vis';
// @ts-ignore
import { SearchStrategiesRegister } from './lib/search_strategies/search_strategies_register';
// @ts-ignore
import { getVisData } from './lib/get_vis_data';
import { UsageCollectionSetup } from '../../../../plugins/usage_collection/server';
import { ValidationTelemetryService } from './validation_telemetry/validation_telemetry_service';

// TODO: Remove as CoreSetup is completed.
export interface CustomCoreSetup {
  http: {
    server: Legacy.Server;
  };
}

export class MetricsServerPlugin {
  public initializerContext: PluginInitializerContext;
  private validationTelementryService: ValidationTelemetryService;

  constructor(initializerContext: PluginInitializerContext) {
    this.initializerContext = initializerContext;
    this.validationTelementryService = new ValidationTelemetryService();
  }

  public async setup(
    core: CoreSetup & CustomCoreSetup,
    deps: { usageCollection?: UsageCollectionSetup }
  ) {
    const { http } = core;

    const validationTelemetrySetup = await this.validationTelementryService.setup(core, {
      ...deps,
      kibanaIndex: http.server.config().get('kibana.index'),
    });

    fieldsRoutes(http.server);
    visDataRoutes(http.server, validationTelemetrySetup);

    // Expose getVisData to allow plugins to use TSVB's backend for metrics
    http.server.expose('getVisData', getVisData);

    SearchStrategiesRegister.init(http.server);
  }
}
