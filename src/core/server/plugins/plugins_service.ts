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
import { ConfigService, Env } from '../config';
import { Logger, LoggerFactory } from '../logging';
import { discover, PluginDiscoveryErrorType } from './discovery';
import { PluginsConfig } from './plugins_config';

export class PluginsService implements CoreService {
  private readonly log: Logger;

  constructor(
    private readonly env: Env,
    private readonly logger: LoggerFactory,
    private readonly configService: ConfigService
  ) {
    this.log = logger.get('plugins', 'service');
  }

  public async start() {
    this.log.debug('starting plugins service');

    // At this stage we report only errors that can occur when new platform plugin
    // manifest is present, otherwise we can't be sure that the plugin is for the new
    // platform and let legacy platform to handle it.
    const errorTypesToReport = [
      PluginDiscoveryErrorType.IncompatibleVersion,
      PluginDiscoveryErrorType.InvalidManifest,
    ];

    const { error$, plugin$ } = await this.configService
      .atPath('plugins', PluginsConfig)
      .pipe(
        first(),
        map(config =>
          discover(config, this.env.packageInfo, this.logger.get('plugins', 'discovery'))
        )
      )
      .toPromise();

    await error$
      .pipe(
        filter(error => errorTypesToReport.includes(error.type)),
        tap(invalidManifestError => this.log.error(invalidManifestError))
      )
      .toPromise();

    await plugin$
      .pipe(
        toArray(),
        tap(plugins => this.log.debug(`Discovered ${plugins.length} plugins.`))
      )
      .toPromise();
  }

  public async stop() {
    this.log.debug('stopping plugins service');
  }
}
