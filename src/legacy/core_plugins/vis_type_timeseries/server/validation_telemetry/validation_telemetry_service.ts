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

import { APICaller, CoreSetup, Plugin } from 'kibana/server';
import { get } from 'lodash';
import { UsageCollectionSetup } from '../../../../../plugins/usage_collection/server';

export interface ValidationTelemetryServiceSetup {
  logFailedValidation: () => void;
}

export class ValidationTelemetryService implements Plugin<ValidationTelemetryServiceSetup> {
  async setup(
    core: CoreSetup,
    {
      usageCollection,
      kibanaIndex,
    }: { usageCollection?: UsageCollectionSetup; kibanaIndex: string }
  ) {
    if (usageCollection) {
      usageCollection.registerCollector(
        usageCollection.makeUsageCollector({
          type: 'tsvb-validation',
          isReady: () => true,
          fetch: async (callCluster: APICaller) => {
            try {
              const response = await callCluster('get', {
                index: kibanaIndex,
                id: 'tsvb-validation-telemetry:tsvb-validation-telemetry',
                ignore: [404],
              });
              return {
                failed_validations: get(
                  response,
                  '_source.tsvb-validation-telemetry.failedRequests',
                  0
                ),
              };
            } catch (err) {
              return {
                failed_validations: 0,
              };
            }
          },
        })
      );
    }
    const internalRepository = core.savedObjects.createInternalRepository();

    return {
      logFailedValidation: async () => {
        try {
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
