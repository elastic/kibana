/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreSetup, Plugin, PluginInitializerContext } from 'kibana/server';
import { UsageCollectionSetup } from '../../../usage_collection/server';
import { tsvbTelemetrySavedObjectType } from '../saved_objects';

export interface ValidationTelemetryServiceSetup {
  logFailedValidation: () => void;
}
export interface Usage {
  failed_validations: number;
}

export class ValidationTelemetryService implements Plugin<ValidationTelemetryServiceSetup> {
  private kibanaIndex: string = '';
  async setup(
    core: CoreSetup,
    {
      usageCollection,
      globalConfig$,
    }: {
      usageCollection?: UsageCollectionSetup;
      globalConfig$: PluginInitializerContext['config']['legacy']['globalConfig$'];
    }
  ) {
    core.savedObjects.registerType(tsvbTelemetrySavedObjectType);
    globalConfig$.subscribe((config) => {
      this.kibanaIndex = config.kibana.index;
    });
    if (usageCollection) {
      usageCollection.registerCollector(
        usageCollection.makeUsageCollector<Usage>({
          type: 'tsvb-validation',
          isReady: () => this.kibanaIndex !== '',
          fetch: async ({ esClient }) => {
            try {
              const { body: response } = await esClient.get(
                {
                  index: this.kibanaIndex,
                  id: 'tsvb-validation-telemetry:tsvb-validation-telemetry',
                },
                { ignore: [404] }
              );
              return {
                failed_validations:
                  response?._source?.['tsvb-validation-telemetry']?.failedRequests || 0,
              };
            } catch (err) {
              return {
                failed_validations: 0,
              };
            }
          },
          schema: {
            failed_validations: { type: 'long' },
          },
        })
      );
    }
    const internalRepositoryPromise = core
      .getStartServices()
      .then(([start]) => start.savedObjects.createInternalRepository());

    return {
      logFailedValidation: async () => {
        try {
          const internalRepository = await internalRepositoryPromise;
          await internalRepository.incrementCounter(
            'tsvb-validation-telemetry',
            'tsvb-validation-telemetry',
            ['failedRequests']
          );
        } catch (e) {
          // swallow error, validation telemetry shouldn't fail anything else
        }
      },
    };
  }
  start() {}
}
