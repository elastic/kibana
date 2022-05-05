/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  IRouter,
  ISavedObjectsRepository,
  MetricsServiceSetup,
  ServiceStatus,
} from '@kbn/core/server';
import { Observable } from 'rxjs';
import { CollectorSet } from '../collector';
import { registerUiCountersRoute } from './ui_counters';
import { registerStatsRoute } from './stats';
import type { UsageCounter } from '../usage_counters';
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
