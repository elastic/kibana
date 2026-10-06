/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type Observable } from 'rxjs';
import type { PackageInfo } from '@kbn/config';
import type { Logger } from '@kbn/logging';
import type { PluginName } from '@kbn/core-base-common';
import type { IRouter } from '@kbn/core-http-server';
import type { RequestHandlerContext } from '@kbn/core-http-request-handler-context-server';
import type { MetricsServiceSetup } from '@kbn/core-metrics-server';
import type { CoreIncrementUsageCounter } from '@kbn/core-usage-data-server';
import { type ServiceStatus, type CoreStatus } from '@kbn/core-status-common';
interface Deps {
  router: IRouter<RequestHandlerContext>;
  logger: Logger;
  config: {
    allowAnonymous: boolean;
    statusPageBypassMonitorPrivilege: boolean;
    packageInfo: PackageInfo;
    serverName: string;
    uuid: string;
  };
  metrics: MetricsServiceSetup;
  status: {
    coreOverall$: Observable<ServiceStatus>;
    overall$: Observable<ServiceStatus>;
    core$: Observable<CoreStatus>;
    plugins$: Observable<Record<PluginName, ServiceStatus>>;
  };
  incrementUsageCounter: CoreIncrementUsageCounter;
}
export declare const registerStatusRoute: ({
  router,
  logger,
  config,
  metrics,
  status,
  incrementUsageCounter,
}: Deps) => void;
export {};
