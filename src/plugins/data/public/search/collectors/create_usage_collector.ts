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
import { StartServicesAccessor } from '../../../../../core/public';
import { METRIC_TYPE, UsageCollectionSetup } from '../../../../usage_collection/public';
import { SEARCH_EVENT_TYPE, SearchUsageCollector } from './types';

export const createUsageCollector = (
  getStartServices: StartServicesAccessor,
  usageCollection?: UsageCollectionSetup
): SearchUsageCollector => {
  const getCurrentApp = async () => {
    const [{ application }] = await getStartServices();
    return application.currentAppId$.pipe(first()).toPromise();
  };

  return {
    trackQueryTimedOut: async () => {
      const currentApp = await getCurrentApp();
      return usageCollection?.reportUiStats(
        currentApp!,
        METRIC_TYPE.LOADED,
        SEARCH_EVENT_TYPE.QUERY_TIMED_OUT
      );
    },
    trackQueriesCancelled: async () => {
      const currentApp = await getCurrentApp();
      return usageCollection?.reportUiStats(
        currentApp!,
        METRIC_TYPE.LOADED,
        SEARCH_EVENT_TYPE.QUERIES_CANCELLED
      );
    },
  };
};
