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

import { Observable, Subscription } from '../../lib/kbn_observable';

import { MutableLoggerFactory } from './logger_factory';
import { LoggingConfig } from './logging_config';

/**
 * Service that is responsible for maintaining the log config subscription and
 * pushing updates the the logger factory.
 */
export class LoggingService {
  private subscription?: Subscription;

  constructor(private readonly loggingFactory: MutableLoggerFactory) {}

  /**
   * Takes `LoggingConfig` observable and pushes all config updates to the
   * internal logger factory.
   * @param config$ Observable that tracks all updates in the logging config.
   */
  public upgrade(config$: Observable<LoggingConfig>) {
    this.subscription = config$.subscribe({
      next: config => this.loggingFactory.updateConfig(config),
    });
  }

  /**
   * Asynchronous method that causes service to unsubscribe from logging config updates
   * and close internal logger factory.
   */
  public async stop() {
    if (this.subscription !== undefined) {
      this.subscription.unsubscribe();
    }
    await this.loggingFactory.close();
  }
}
