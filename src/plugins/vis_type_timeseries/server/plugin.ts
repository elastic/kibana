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

import { PluginInitializerContext, CoreSetup, CoreStart, Plugin } from 'src/core/server';
import { Observable, AsyncSubject } from 'rxjs';
import { Server } from 'hapi';
import { once } from 'lodash';
import { VisTypeTimeseriesConfig } from '.';

export interface LegacySetup {
  server: Server;
}

export interface VisTypeTimeseriesSetup {
  /** @deprecated */
  __legacy: {
    config$: Observable<VisTypeTimeseriesConfig>;
    registerLegacyAPI: (__LEGACY: LegacySetup) => void;
  };
}

export class VisTypeTimeseriesPlugin implements Plugin<VisTypeTimeseriesSetup> {
  legacySetup$: AsyncSubject<LegacySetup>;
  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.initializerContext = initializerContext;
    this.legacySetup$ = new AsyncSubject();
  }

  public setup(core: CoreSetup) {
    const logger = this.initializerContext.logger.get('visTypeTimeseries');

    this.legacySetup$.subscribe(__LEGACY => {
      // Create vis type timeseries API
    });

    return {
      __legacy: {
        config$: this.initializerContext.config.create<VisTypeTimeseriesConfig>(),
        registerLegacyAPI: once((__LEGACY: LegacySetup) => {
          this.legacySetup$.next(__LEGACY);
          this.legacySetup$.complete();
        }),
      },
    };
  }

  public start(core: CoreStart) {}
}
