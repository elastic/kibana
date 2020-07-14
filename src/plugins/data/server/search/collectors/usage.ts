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

import { CoreSetup } from 'kibana/server';
import { DataPluginStart } from '../../plugin';
import { Usage } from './register';

const SAVED_OBJECT_ID = 'search-telemetry';

export interface SearchUsage {
  trackError(duration: number): Promise<void>;
  trackSuccess(duration: number): Promise<void>;
}

export function usageProvider(core: CoreSetup<object, DataPluginStart>): SearchUsage {
  const getTracker = (eventType: string) => {
    return async (duration: number) => {
      const repository = await core
        .getStartServices()
        .then(([coreStart]) => coreStart.savedObjects.createInternalRepository());

      await repository.incrementCounter(SAVED_OBJECT_ID, SAVED_OBJECT_ID, eventType);

      const { attributes } = await repository.get<Usage>(SAVED_OBJECT_ID, SAVED_OBJECT_ID);
      const averageDuration =
        (duration + (attributes.averageDuration ?? 0)) /
        ((attributes.errorCount ?? 0) + (attributes.successCount ?? 0));

      const newAttributes = { ...attributes, averageDuration };
      await repository.update(SAVED_OBJECT_ID, SAVED_OBJECT_ID, newAttributes);
    };
  };

  return {
    trackError: getTracker('errorCount'),
    trackSuccess: getTracker('successCount'),
  };
}
