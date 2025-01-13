/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { CoreSetup, Plugin, PluginInitializerContext } from '@kbn/core/server';
import { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import { registerKqlTelemetryRoute } from './route';
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
      try {
        const getIndexForType = (type: string) =>
          getStartServices().then(([coreStart]) => coreStart.savedObjects.getIndexForType(type));
        makeKQLUsageCollector(usageCollection, getIndexForType);
      } catch (e) {
        this.initializerContext.logger
          .get('kql-telemetry')
          .warn(`Registering KQL telemetry collector failed: ${e}`);
      }
    }
  }

  public start() {}
}
