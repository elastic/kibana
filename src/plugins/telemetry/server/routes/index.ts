/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Observable } from 'rxjs';
import type { IRouter, Logger, SavedObjectsClient } from '@kbn/core/server';
import type { TelemetryCollectionManagerPluginSetup } from '@kbn/telemetry-collection-manager-plugin/server';
import type { TelemetryConfigType } from '../config';
import { registerTelemetryConfigRoutes } from './telemetry_config';
import { registerTelemetryOptInRoutes } from './telemetry_opt_in';
import { registerTelemetryUsageStatsRoutes, type SecurityGetter } from './telemetry_usage_stats';
import { registerTelemetryOptInStatsRoutes } from './telemetry_opt_in_stats';
import { registerTelemetryUserHasSeenNotice } from './telemetry_user_has_seen_notice';
import { registerTelemetryLastReported } from './telemetry_last_reported';

interface RegisterRoutesParams {
  isDev: boolean;
  logger: Logger;
  config$: Observable<TelemetryConfigType>;
  currentKibanaVersion: string;
  router: IRouter;
  telemetryCollectionManager: TelemetryCollectionManagerPluginSetup;
  savedObjectsInternalClient$: Observable<SavedObjectsClient>;
  getSecurity: SecurityGetter;
}

export function registerRoutes(options: RegisterRoutesParams) {
  const { isDev, telemetryCollectionManager, router, savedObjectsInternalClient$, getSecurity } =
    options;
  registerTelemetryOptInRoutes(options);
  registerTelemetryConfigRoutes(options);
  registerTelemetryUsageStatsRoutes(router, telemetryCollectionManager, isDev, getSecurity);
  registerTelemetryOptInStatsRoutes(router, telemetryCollectionManager);
  registerTelemetryUserHasSeenNotice(router);
  registerTelemetryLastReported(router, savedObjectsInternalClient$);
}
