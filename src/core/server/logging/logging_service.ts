/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Observable, Subscription } from 'rxjs';
import { Logger } from '@kbn/logging';
import { CoreService } from '../../types';
import { LoggingConfig, LoggerContextConfigInput } from './logging_config';
import { ILoggingSystem } from './logging_system';
import { CoreContext } from '../core_context';

/**
 * Provides APIs to plugins for customizing the plugin's logger.
 * @public
 */
export interface LoggingServiceSetup {
  /**
   * Customizes the logging config for the plugin's context.
   *
   * @remarks
   * Assumes that that the `context` property of the individual `logger` items emitted by `config$`
   * are relative to the plugin's logging context (defaults to `plugins.<plugin_id>`).
   *
   * @example
   * Customize the configuration for the plugins.data.search context.
   * ```ts
   * core.logging.configure(
   *   of({
   *     appenders: new Map(),
   *     loggers: [{ name: 'search', appenders: ['default'] }]
   *   })
   * )
   * ```
   *
   * @param config$
   */
  configure(config$: Observable<LoggerContextConfigInput>): void;
}

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
