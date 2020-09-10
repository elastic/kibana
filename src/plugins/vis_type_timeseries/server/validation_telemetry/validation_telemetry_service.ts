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

import { LegacyAPICaller, CoreSetup, Plugin, PluginInitializerContext } from 'kibana/server';
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
          fetch: async (callCluster: LegacyAPICaller) => {
            try {
              const response = await callCluster('get', {
                index: this.kibanaIndex,
                id: 'tsvb-validation-telemetry:tsvb-validation-telemetry',
                ignore: [404],
              });
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
            'failedRequests'
          );
        } catch (e) {
          // swallow error, validation telemetry shouldn't fail anything else
        }
      },
    };
  }
  start() {}
}
