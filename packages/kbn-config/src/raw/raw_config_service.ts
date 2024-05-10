/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { cloneDeep, isPlainObject } from 'lodash';
import { Observable, ReplaySubject } from 'rxjs';
import { map } from 'rxjs';
import typeDetect from 'type-detect';

import { getConfigFromFiles } from './read_config';

export type RawConfigAdapter = (rawConfig: Record<string, any>) => Record<string, any>;

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
