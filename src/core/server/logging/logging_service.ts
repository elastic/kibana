/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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
   *     loggers: [{ context: 'search', appenders: ['default'] }]
   *   })
   * )
   * ```
   *
   * @param config$
   */
  configure(config$: Observable<LoggerContextConfigInput>): void;
}

/** @internal */
export interface InternalLoggingServiceSetup {
  configure(contextParts: string[], config$: Observable<LoggerContextConfigInput>): void;
}

interface SetupDeps {
  loggingSystem: ILoggingSystem;
}

/** @internal */
export class LoggingService implements CoreService<InternalLoggingServiceSetup> {
  private readonly subscriptions = new Map<string, Subscription>();
  private readonly log: Logger;

  constructor(coreContext: CoreContext) {
    this.log = coreContext.logger.get('logging');
  }

  public setup({ loggingSystem }: SetupDeps) {
    return {
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
  }

  public start() {}

  public stop() {
    for (const [, subscription] of this.subscriptions) {
      subscription.unsubscribe();
    }
  }
}
