/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Observable } from 'rxjs';
import type { CoreContext, CoreService } from '@kbn/core-base-server-internal';
import type { LoggerContextConfigInput } from '@kbn/core-logging-server';
import type { ILoggingSystem } from './logging_system';
/** @internal */
export interface InternalLoggingServicePreboot {
  configure(contextParts: string[], config$: Observable<LoggerContextConfigInput>): void;
}
/** @internal */
export type InternalLoggingServiceSetup = InternalLoggingServicePreboot;
export interface PrebootDeps {
  loggingSystem: ILoggingSystem;
}
/** @internal */
export declare class LoggingService implements CoreService<InternalLoggingServiceSetup> {
  private readonly subscriptions;
  private readonly log;
  private internalPreboot?;
  constructor(coreContext: CoreContext);
  preboot({ loggingSystem }: PrebootDeps): InternalLoggingServicePreboot;
  setup(): {
    configure: (contextParts: string[], config$: Observable<LoggerContextConfigInput>) => void;
  };
  start(): void;
  stop(): void;
}
