/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { first } from 'rxjs/operators';
import type { CoreSetup } from '../../../../core/server';
import type { Plugin, PluginInitializerContext } from '../../../../core/server/plugins/types';
import type { UsageCollectionSetup } from '../../../usage_collection/server/plugin';
import { kqlTelemetry } from '../saved_objects/kql_telemetry';
import { registerKqlTelemetryRoute } from './route';
import { makeKQLUsageCollector } from './usage_collector/make_kql_usage_collector';

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
