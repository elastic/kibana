/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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
