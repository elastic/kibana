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

import { Observable } from 'rxjs';
import { IRouter, Logger } from 'kibana/server';
import { TelemetryCollectionManagerPluginSetup } from 'src/plugins/telemetry_collection_manager/server';
import { registerTelemetryOptInRoutes } from './telemetry_opt_in';
import { registerTelemetryUsageStatsRoutes } from './telemetry_usage_stats';
import { registerTelemetryOptInStatsRoutes } from './telemetry_opt_in_stats';
import { registerTelemetryUserHasSeenNotice } from './telemetry_user_has_seen_notice';
import { TelemetryConfigType } from '../config';

interface RegisterRoutesParams {
  isDev: boolean;
  logger: Logger;
  config$: Observable<TelemetryConfigType>;
  currentKibanaVersion: string;
  router: IRouter;
  telemetryCollectionManager: TelemetryCollectionManagerPluginSetup;
}

export function registerRoutes(options: RegisterRoutesParams) {
  const { isDev, telemetryCollectionManager, router } = options;
  registerTelemetryOptInRoutes(options);
  registerTelemetryUsageStatsRoutes(router, telemetryCollectionManager, isDev);
  registerTelemetryOptInStatsRoutes(router, telemetryCollectionManager);
  registerTelemetryUserHasSeenNotice(router);
}
