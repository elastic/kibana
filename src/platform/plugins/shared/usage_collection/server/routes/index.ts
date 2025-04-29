/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  IRouter,
  ISavedObjectsRepository,
  type MetricsServiceSetup,
  ServiceStatus,
} from '@kbn/core/server';
import type { Observable } from 'rxjs';
import type { ICollectorSet } from '../collector';
import { registerUiCountersRoute } from './ui_counters';
import { registerStatsRoute } from './stats';
import type { UsageCountersServiceSetup } from '../usage_counters';
export function setupRoutes({
  router,
  usageCounters,
  getSavedObjects,
  ...rest
}: {
  router: IRouter;
  getSavedObjects: () => ISavedObjectsRepository | undefined;
  usageCounters: UsageCountersServiceSetup;
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
  collectorSet: ICollectorSet;
  metrics: MetricsServiceSetup;
  overallStatus$: Observable<ServiceStatus>;
}) {
  registerUiCountersRoute(router, getSavedObjects, usageCounters);
  registerStatsRoute({ router, ...rest });
}
