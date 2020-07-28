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

import { cloneDeep, isPlainObject } from 'lodash';
import { Observable, ReplaySubject } from 'rxjs';
import { map } from 'rxjs/operators';
import typeDetect from 'type-detect';

import { getConfigFromFiles } from './read_config';

type RawConfigAdapter = (rawConfig: Record<string, any>) => Record<string, any>;

export type RawConfigurationProvider = Pick<RawConfigService, 'getConfig$'>;

/** @internal */
export class RawConfigService {
  /**
   * The stream of configs read from the config file.
   *
   * This is the _raw_ config before any overrides are applied.
   */
  private readonly rawConfigFromFile$: ReplaySubject<Record<string, any>> = new ReplaySubject(1);

  private readonly config$: Observable<Record<string, any>>;

  constructor(
    public readonly configFiles: readonly string[],
    configAdapter: RawConfigAdapter = (rawConfig) => rawConfig
  ) {
    this.config$ = this.rawConfigFromFile$.pipe(
      map((rawConfig) => {
        if (isPlainObject(rawConfig)) {
          // TODO Make config consistent, e.g. handle dots in keys
          return configAdapter(cloneDeep(rawConfig));
        }

        throw new Error(`the raw config must be an object, got [${typeDetect(rawConfig)}]`);
      })
    );
  }

  /**
   * Read the initial Kibana config.
   */
  public loadConfig() {
    this.rawConfigFromFile$.next(getConfigFromFiles(this.configFiles));
  }

  public stop() {
    this.rawConfigFromFile$.complete();
  }

  /**
   * Re-read the Kibana config.
   */
  public reloadConfig() {
    this.loadConfig();
  }

  public getConfig$() {
    return this.config$;
  }
}
