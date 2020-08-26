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
import {
  CoreSetup,
  CoreStart,
  Plugin,
  PluginInitializerContext,
  IUiSettingsClient,
} from 'kibana/public';
import { Plugin as ExpressionsPublicPlugin } from '../../expressions/public';
import { VisualizationsSetup } from '../../visualizations/public';
// TODO: Determine why visualizations don't populate without this
import 'angular-sanitize';

// @ts-ignore
import { createTileMapFn } from './tile_map_fn';
// @ts-ignore
import { createTileMapTypeDefinition } from './tile_map_type';
import { IServiceSettings, MapsLegacyPluginSetup } from '../../maps_legacy/public';
import { DataPublicPluginStart } from '../../data/public';
import { setFormatService, setQueryService, setKibanaLegacy } from './services';
import { KibanaLegacyStart } from '../../kibana_legacy/public';

export interface TileMapConfigType {
  tilemap: any;
}

/** @private */
interface TileMapVisualizationDependencies {
  uiSettings: IUiSettingsClient;
  getZoomPrecision: any;
  getPrecision: any;
  BaseMapsVisualization: any;
  serviceSettings: IServiceSettings;
}

/** @internal */
export interface TileMapPluginSetupDependencies {
  expressions: ReturnType<ExpressionsPublicPlugin['setup']>;
  visualizations: VisualizationsSetup;
  mapsLegacy: MapsLegacyPluginSetup;
}

/** @internal */
export interface TileMapPluginStartDependencies {
  data: DataPublicPluginStart;
  kibanaLegacy: KibanaLegacyStart;
}

export interface TileMapPluginSetup {
  config: any;
}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface TileMapPluginStart {}

/** @internal */
export class TileMapPlugin implements Plugin<TileMapPluginSetup, TileMapPluginStart> {
  initializerContext: PluginInitializerContext;

  constructor(initializerContext: PluginInitializerContext) {
    this.initializerContext = initializerContext;
  }

  public async setup(
    core: CoreSetup,
    { expressions, visualizations, mapsLegacy }: TileMapPluginSetupDependencies
  ) {
    const { getZoomPrecision, getPrecision, serviceSettings } = mapsLegacy;
    const visualizationDependencies: Readonly<TileMapVisualizationDependencies> = {
      getZoomPrecision,
      getPrecision,
      BaseMapsVisualization: mapsLegacy.getBaseMapsVis(),
      uiSettings: core.uiSettings,
      serviceSettings,
    };

    expressions.registerFunction(() => createTileMapFn(visualizationDependencies));

    visualizations.createBaseVisualization(createTileMapTypeDefinition(visualizationDependencies));

    const config = this.initializerContext.config.get<TileMapConfigType>();
    return {
      config,
    };
  }

  public start(core: CoreStart, { data, kibanaLegacy }: TileMapPluginStartDependencies) {
    setFormatService(data.fieldFormats);
    setQueryService(data.query);
    setKibanaLegacy(kibanaLegacy);
    return {};
  }
}
