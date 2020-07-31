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

import { Plugin, PluginConfigDescriptor } from 'kibana/server';
import { PluginInitializerContext } from 'src/core/server';
import { Observable } from 'rxjs';
import { configSchema, ConfigSchema } from '../config';

export const config: PluginConfigDescriptor<ConfigSchema> = {
  exposeToBrowser: {
    includeElasticMapsService: true,
    proxyElasticMapsServiceInMaps: true,
    tilemap: true,
    regionmap: true,
    manifestServiceUrl: true,
    emsFileApiUrl: true,
    emsTileApiUrl: true,
    emsLandingPageUrl: true,
    emsFontLibraryUrl: true,
    emsTileLayerId: true,
  },
  schema: configSchema,
};

export interface MapsLegacyPluginSetup {
  config$: Observable<ConfigSchema>;
}

export class MapsLegacyPlugin implements Plugin<MapsLegacyPluginSetup> {
  readonly _initializerContext: PluginInitializerContext<ConfigSchema>;

  constructor(initializerContext: PluginInitializerContext<ConfigSchema>) {
    this._initializerContext = initializerContext;
  }

  public setup() {
    // @ts-ignore
    const config$ = this._initializerContext.config.create();
    return {
      config$,
    };
  }

  public start() {}
}

export const plugin = (initializerContext: PluginInitializerContext) =>
  new MapsLegacyPlugin(initializerContext);
