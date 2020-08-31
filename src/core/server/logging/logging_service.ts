/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { Observable, Subscription } from 'rxjs';
import { CoreService } from '../../types';
import { LoggingConfig, LoggerContextConfigInput } from './logging_config';
import { ILoggingSystem } from './logging_system';
import { Logger } from './logger';
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
