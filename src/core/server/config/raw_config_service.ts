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

import { cloneDeep, isEqual, isPlainObject } from 'lodash';
import { BehaviorSubject, Observable } from 'rxjs';
import { distinctUntilChanged, filter, map } from 'rxjs/operators';
import typeDetect from 'type-detect';

import { Config } from './config';
import { ObjectToConfigAdapter } from './object_to_config_adapter';
import { getConfigFromFiles } from './read_config';

// Used to indicate that no config has been received yet
const notRead = Symbol('config not yet read');

export class RawConfigService {
  /**
   * The stream of configs read from the config file. Will be the symbol
   * `notRead` before the config is initially read, and after that it can
   * potentially be `null` for an empty yaml file.
   *
   * This is the _raw_ config before any overrides are applied.
   *
   * As we have a notion of a _current_ config we rely on a BehaviorSubject so
   * every new subscription will immediately receive the current config.
   */
  private readonly rawConfigFromFile$ = new BehaviorSubject<any>(notRead);

  private readonly config$: Observable<Config>;

  constructor(
    readonly configFiles: ReadonlyArray<string>,
    configAdapter: (rawConfig: Record<string, any>) => Config = rawConfig =>
      new ObjectToConfigAdapter(rawConfig)
  ) {
    this.config$ = this.rawConfigFromFile$.pipe(
      filter(rawConfig => rawConfig !== notRead),
      // We only want to update the config if there are changes to it.
      distinctUntilChanged(isEqual),
      map(rawConfig => {
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
