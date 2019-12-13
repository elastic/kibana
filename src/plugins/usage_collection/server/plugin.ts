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

import { first } from 'rxjs/operators';
import { TypeOf } from '@kbn/config-schema';
import { ConfigSchema } from './config';
import { PluginInitializerContext, Logger } from '../../../../src/core/server';
import { CollectorSet } from './collector';

export type UsageCollectionSetup = CollectorSet;

export class Plugin {
  logger: Logger;
  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.logger = this.initializerContext.logger.get();
  }

  public async setup(): Promise<UsageCollectionSetup> {
    const config = await this.initializerContext.config
      .create<TypeOf<typeof ConfigSchema>>()
      .pipe(first())
      .toPromise();

    const collectorSet = new CollectorSet({
      logger: this.logger,
      maximumWaitTimeForAllCollectorsInS: config.maximumWaitTimeForAllCollectorsInS,
    });

    return collectorSet;
  }

  public start() {
    this.logger.debug('Starting plugin');
  }

  public stop() {
    this.logger.debug('Stopping plugin');
  }
}
