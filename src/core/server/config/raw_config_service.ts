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

import { isEqual, isPlainObject } from 'lodash';
import typeDetect from 'type-detect';
import {
  BehaviorSubject,
  filter,
  k$,
  map,
  Observable,
  skipRepeats,
} from '../../lib/kbn_observable';

import { ObjectToRawConfigAdapter } from './object_to_raw_config_adapter';
import { RawConfig } from './raw_config';
import { getConfigFromFile } from './read_config';

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
  private readonly rawConfigFromFile$: BehaviorSubject<any> = new BehaviorSubject(notRead);

  private readonly config$: Observable<RawConfig>;

  constructor(readonly configFile: string) {
    this.config$ = k$(this.rawConfigFromFile$)(
      filter(rawConfig => rawConfig !== notRead),
      map(rawConfig => {
        // If the raw config is null, e.g. if empty config file, we default to
        // an empty config
        if (rawConfig == null) {
          return new ObjectToRawConfigAdapter({});
        }

        if (isPlainObject(rawConfig)) {
          // TODO Make config consistent, e.g. handle dots in keys
          return new ObjectToRawConfigAdapter(rawConfig);
        }

        throw new Error(`the raw config must be an object, got [${typeDetect(rawConfig)}]`);
      }),
      // We only want to update the config if there are changes to it
      skipRepeats(isEqual)
    );
  }

  /**
   * Read the initial Kibana config.
   */
  public loadConfig() {
    const config = getConfigFromFile(this.configFile);
    this.rawConfigFromFile$.next(config);
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
