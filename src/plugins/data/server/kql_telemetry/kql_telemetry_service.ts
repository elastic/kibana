/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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
