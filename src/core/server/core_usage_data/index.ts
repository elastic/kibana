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
export { CoreUsageDataStart } from './types';
export { CoreUsageDataService } from './core_usage_data_service';

// Because of #79265 we need to explicity import, then export these types for
// scripts/telemetry_check.js to work as expected
import {
  CoreUsageData,
  CoreConfigUsageData,
  CoreEnvironmentUsageData,
  CoreServicesUsageData,
} from './types';

export { CoreUsageData, CoreConfigUsageData, CoreEnvironmentUsageData, CoreServicesUsageData };
