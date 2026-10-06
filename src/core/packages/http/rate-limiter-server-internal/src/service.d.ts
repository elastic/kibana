/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type Observable } from 'rxjs';
import type { CoreService } from '@kbn/core-base-server-internal';
import type { InternalHttpServiceSetup } from '@kbn/core-http-server-internal';
import { type InternalMetricsServiceSetup } from '@kbn/core-metrics-server-internal';
import { type ServiceStatus } from '@kbn/core-status-common';
/** @internal */
export interface SetupDeps {
  http: InternalHttpServiceSetup;
  metrics: InternalMetricsServiceSetup;
}
/** @internal */
export interface InternalRateLimiterSetup {
  status$: Observable<ServiceStatus | undefined>;
}
/** @internal */
export type InternalRateLimiterStart = void;
/** @internal */
export declare class HttpRateLimiterService
  implements CoreService<InternalRateLimiterSetup, InternalRateLimiterStart>
{
  private status$;
  private state$;
  private ready$;
  private stopped$;
  private handler;
  private watch;
  setup({ http, metrics }: SetupDeps): InternalRateLimiterSetup;
  start(): InternalRateLimiterStart;
  stop(): void;
}
