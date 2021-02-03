/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import {
  IRouter,
  ISavedObjectsRepository,
  MetricsServiceSetup,
  ServiceStatus,
} from 'src/core/server';
import { Observable } from 'rxjs';
import { CollectorSet } from '../collector';
import { registerUiCountersRoute } from './ui_counters';
import { registerStatsRoute } from './stats';

export function setupRoutes({
  router,
  getSavedObjects,
  ...rest
}: {
  router: IRouter;
  getSavedObjects: () => ISavedObjectsRepository | undefined;
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
  registerUiCountersRoute(router, getSavedObjects);
  registerStatsRoute({ router, ...rest });
}
