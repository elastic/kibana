/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Observable, Subscription } from 'rxjs';
import { Logger } from '@kbn/logging';
import type { CoreContext, CoreService } from '@kbn/core-base-server-internal';
import type { LoggerContextConfigInput } from '@kbn/core-logging-server';
import { LoggingConfig } from './logging_config';
import { ILoggingSystem } from './logging_system';

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
export class LoggingService implements CoreService<InternalLoggingServiceSetup> {
  private readonly subscriptions = new Map<string, Subscription>();
  private readonly log: Logger;
  private internalPreboot?: InternalLoggingServicePreboot;

  constructor(coreContext: CoreContext) {
    this.log = coreContext.logger.get('logging');
  }

  public preboot({ loggingSystem }: PrebootDeps) {
    this.internalPreboot = {
      configure: (contextParts: string[], config$: Observable<LoggerContextConfigInput>) => {
        const contextName = LoggingConfig.getLoggerContext(contextParts);
        this.log.debug(`Setting custom config for context [${contextName}]`);

        const existingSubscription = this.subscriptions.get(contextName);
        if (existingSubscription) {
          existingSubscription.unsubscribe();
        }

        // Might be fancier way to do this with rxjs, but this works and is simple to understand
        this.subscriptions.set(
          contextName,
          config$.subscribe((config) => {
            this.log.debug(`Updating logging config for context [${contextName}]`);
            loggingSystem.setContextConfig(contextParts, config);
          })
        );
      },
    };

    return this.internalPreboot;
  }

  public setup() {
    return {
      configure: this.internalPreboot!.configure,
    };
  }

  public start() {}

  public stop() {
    for (const [, subscription] of this.subscriptions) {
      subscription.unsubscribe();
    }
  }
}
