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

import { filter, first, map, tap, toArray } from 'rxjs/operators';
import { CoreService } from '../../types/core_service';
import { ConfigService } from '../config';
import { Logger, LoggerFactory } from '../logging';
import { PluginDiscoveryErrorType } from './plugin_discovery_error';
import { PluginsConfig } from './plugins_config';
import { discover } from './plugins_discovery';

export class PluginsService implements CoreService {
  private readonly log: Logger;

  constructor(
    private readonly logger: LoggerFactory,
    private readonly configService: ConfigService
  ) {
    this.log = logger.get('plugins', 'service');
  }

  public async start() {
    this.log.debug('starting plugins service');

    const { errors$, plugins$ } = await this.configService
      .atPath('plugins', PluginsConfig)
      .pipe(
        first(),
        map(config => discover(this.logger.get('plugins', 'discovery'), config))
      )
      .toPromise();

    await plugins$
      .pipe(
        toArray(),
        tap(plugins => this.log.debug(`Discovered ${plugins.length} plugins.`))
      )
      .toPromise();

    await errors$
      .pipe(
        filter(error => error.type === PluginDiscoveryErrorType.InvalidManifest),
        tap(invalidManifestError => this.log.error(invalidManifestError))
      )
      .toPromise();
  }

  public async stop() {
    this.log.debug('stopping plugins service');
  }
}
