/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreService } from '@kbn/core-base-browser-internal';
import type { FatalErrorsSetup } from '@kbn/core-fatal-errors-browser';
import type { InternalHttpSetup } from '@kbn/core-http-browser-internal';
/** @internal */
export interface SetupDeps {
  fatalErrors: FatalErrorsSetup;
  http: InternalHttpSetup;
}
/** @internal */
export type InternalRateLimiterSetup = void;
/** @internal */
export type InternalRateLimiterStart = void;
/** @internal */
export declare class HttpRateLimiterService
  implements CoreService<InternalRateLimiterSetup, InternalRateLimiterStart>
{
  setup({ http, fatalErrors }: SetupDeps): InternalRateLimiterSetup;
  start(): InternalRateLimiterStart;
  stop(): void;
}
