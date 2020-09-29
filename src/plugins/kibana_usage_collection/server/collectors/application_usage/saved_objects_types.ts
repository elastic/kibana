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

import { SavedObjectAttributes, SavedObjectsServiceSetup } from 'kibana/server';

/**
 * Used for accumulating the totals of all the stats older than 90d
 */
export interface ApplicationUsageTotal extends SavedObjectAttributes {
  appId: string;
  minutesOnScreen: number;
  numberOfClicks: number;
}
export const SAVED_OBJECTS_TOTAL_TYPE = 'application_usage_totals';

/**
 * Used for storing each of the reports received from the users' browsers
 */
export interface ApplicationUsageTransactional extends ApplicationUsageTotal {
  timestamp: string;
}
export const SAVED_OBJECTS_TRANSACTIONAL_TYPE = 'application_usage_transactional';

/**
 * Used to aggregate the transactional events into daily summaries so we can purge the granular events
 */
export type ApplicationUsageDaily = ApplicationUsageTransactional;
export const SAVED_OBJECTS_DAILY_TYPE = 'application_usage_daily';

export function registerMappings(registerType: SavedObjectsServiceSetup['registerType']) {
  // Type for storing ApplicationUsageTotal
  registerType({
    name: SAVED_OBJECTS_TOTAL_TYPE,
    hidden: false,
    namespaceType: 'agnostic',
    mappings: {
      // Not indexing any of its contents because we use them "as-is" and don't search by these fields
      // for more info, see the README.md for application_usage
      dynamic: false,
      properties: {},
    },
  });

  // Type for storing ApplicationUsageDaily
  registerType({
    name: SAVED_OBJECTS_DAILY_TYPE,
    hidden: false,
    namespaceType: 'agnostic',
    mappings: {
      dynamic: false,
      properties: {
        // This type requires `timestamp` to be indexed so we can use it when rolling up totals (timestamp < now-90d)
        timestamp: { type: 'date' },
      },
    },
  });

  // Type for storing ApplicationUsageTransactional (declaring empty mappings because we don't use the internal fields for query/aggregations)
  registerType({
    name: SAVED_OBJECTS_TRANSACTIONAL_TYPE,
    hidden: false,
    namespaceType: 'agnostic',
    mappings: {
      dynamic: false,
      properties: {},
    },
  });
}
