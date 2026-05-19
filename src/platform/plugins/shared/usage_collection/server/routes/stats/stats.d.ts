/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Observable } from 'rxjs';
import type { IRouter, ServiceStatus } from '@kbn/core/server';
import { type MetricsServiceSetup } from '@kbn/core/server';
import type { ICollectorSet } from '../../collector';
export declare function registerStatsRoute({
  router,
  config,
  collectorSet,
  metrics,
  overallStatus$,
}: {
  router: IRouter;
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
}): void;
