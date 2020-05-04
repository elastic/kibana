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
} from '../../../../core/public';
import { Plugin as ExpressionsPublicPlugin } from '../../../../plugins/expressions/public';
import { VisualizationsSetup } from '../../../../plugins/visualizations/public';
// TODO: Determine why visualizations don't populate without this
import 'angular-sanitize';

// @ts-ignore
import { createTileMapFn } from './tile_map_fn';
// @ts-ignore
import { createTileMapTypeDefinition } from './tile_map_type';
import { getBaseMapsVis, MapsLegacyPluginSetup } from '../../../../plugins/maps_legacy/public';

/** @private */
interface TileMapVisualizationDependencies {
  uiSettings: IUiSettingsClient;
  getZoomPrecision: any;
  getPrecision: any;
  BaseMapsVisualization: any;
}

/** @internal */
export interface TileMapPluginSetupDependencies {
  expressions: ReturnType<ExpressionsPublicPlugin['setup']>;
  visualizations: VisualizationsSetup;
  mapsLegacy: MapsLegacyPluginSetup;
}

/** @internal */
export class TileMapPlugin implements Plugin<Promise<void>, void> {
  initializerContext: PluginInitializerContext;

  constructor(initializerContext: PluginInitializerContext) {
    this.initializerContext = initializerContext;
  }

  public async setup(
    core: CoreSetup,
    { expressions, visualizations, mapsLegacy }: TileMapPluginSetupDependencies
  ) {
    const { getZoomPrecision, getPrecision } = mapsLegacy;
    const visualizationDependencies: Readonly<TileMapVisualizationDependencies> = {
      getZoomPrecision,
      getPrecision,
      BaseMapsVisualization: getBaseMapsVis(core, mapsLegacy.serviceSettings),
      uiSettings: core.uiSettings,
    };

    expressions.registerFunction(() => createTileMapFn(visualizationDependencies));

    visualizations.createBaseVisualization(createTileMapTypeDefinition(visualizationDependencies));
  }

  public start(core: CoreStart) {
    // nothing to do here yet
  }
}
