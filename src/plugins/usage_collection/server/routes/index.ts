/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { Observable } from 'rxjs';
import type { IRouter } from '../../../../core/server/http/router/router';
import type { MetricsServiceSetup } from '../../../../core/server/metrics/types';
import type { ISavedObjectsRepository } from '../../../../core/server/saved_objects/service/lib/repository';
import type { ServiceStatus } from '../../../../core/server/status/types';
import { CollectorSet } from '../collector/collector_set';
import type { IUsageCounter as UsageCounter } from '../usage_counters/usage_counter';
import { registerStatsRoute } from './stats/stats';
import { registerUiCountersRoute } from './ui_counters';

export function setupRoutes({
  router,
  uiCountersUsageCounter,
  getSavedObjects,
  ...rest
}: {
  router: IRouter;
  getSavedObjects: () => ISavedObjectsRepository | undefined;
  uiCountersUsageCounter: UsageCounter;
  config: {
    allowAnonymous: boolean;
    kibanaIndex: string;
    kibanaVersion: string;
    uuid: string;
    server: {
      name: string;
      hostname: string;
      port: number;
    };
  };
  collectorSet: CollectorSet;
  metrics: MetricsServiceSetup;
  overallStatus$: Observable<ServiceStatus>;
}) {
  registerUiCountersRoute(router, getSavedObjects, uiCountersUsageCounter);
  registerStatsRoute({ router, ...rest });
}
