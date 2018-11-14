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
import { Logger, PluginInitializerCore, PluginName, PluginStartCore } from '../../../';
import { TestBedConfig } from './config';

class Plugin {
  private readonly log: Logger;

  constructor(private readonly core: PluginInitializerCore) {
    this.log = this.core.logger.get();
  }

  public async start(core: PluginStartCore, deps: Record<PluginName, unknown>) {
    this.log.debug(
      `Starting TestBed with core contract [${Object.keys(core)}] and deps [${Object.keys(deps)}]`
    );

    const config = await this.core.config
      .create(TestBedConfig)
      .pipe(first())
      .toPromise();

    this.log.debug(`I've got value from my config: ${config.secret}`);

    return { secret: config.secret };
  }

  public stop() {
    this.log.debug(`Stopping TestBed`);
  }
}

export const plugin = (core: PluginInitializerCore) => new Plugin(core);
