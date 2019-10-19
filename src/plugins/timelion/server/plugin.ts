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
import { PluginInitializerContext, RecursiveReadonly } from '../../../../src/core/server';
import { deepFreeze } from '../../../../src/core/utils';
import { ConfigSchema } from './config';

/**
 * Describes public Timelion plugin contract returned at the `setup` stage.
 */
export interface PluginSetupContract {
  uiEnabled: boolean;
}

/**
 * Represents Timelion Plugin instance that will be managed by the Kibana plugin system.
 */
export class Plugin {
  constructor(private readonly initializerContext: PluginInitializerContext) {}

  public async setup(): Promise<RecursiveReadonly<PluginSetupContract>> {
    const config = await this.initializerContext.config
      .create<TypeOf<typeof ConfigSchema>>()
      .pipe(first())
      .toPromise();

    return deepFreeze({ uiEnabled: config.ui.enabled });
  }

  public start() {
    this.initializerContext.logger.get().debug('Starting plugin');
  }

  public stop() {
    this.initializerContext.logger.get().debug('Stopping plugin');
  }
}
