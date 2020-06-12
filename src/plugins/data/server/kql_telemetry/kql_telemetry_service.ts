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

import { first } from 'rxjs/operators';
import { CoreSetup, Plugin, PluginInitializerContext } from 'kibana/server';
import { registerKqlTelemetryRoute } from './route';
import { UsageCollectionSetup } from '../../../usage_collection/server';
import { makeKQLUsageCollector } from './usage_collector';
import { kqlTelemetry } from '../saved_objects';

export class KqlTelemetryService implements Plugin<void> {
  constructor(private initializerContext: PluginInitializerContext) {}

  public setup(
    { http, getStartServices, savedObjects }: CoreSetup,
    { usageCollection }: { usageCollection?: UsageCollectionSetup }
  ) {
    savedObjects.registerType(kqlTelemetry);
    registerKqlTelemetryRoute(
      http.createRouter(),
      getStartServices,
      this.initializerContext.logger.get('data', 'kql-telemetry')
    );

    if (usageCollection) {
      this.initializerContext.config.legacy.globalConfig$
        .pipe(first())
        .toPromise()
        .then((config) => makeKQLUsageCollector(usageCollection, config.kibana.index))
        .catch((e) => {
          this.initializerContext.logger
            .get('kql-telemetry')
            .warn(`Registering KQL telemetry collector failed: ${e}`);
        });
    }
  }

  public start() {}
}
