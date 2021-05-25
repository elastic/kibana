/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
import { MapsLegacyPluginSetup } from '../../maps_legacy/public';
import { MapsEmsPluginSetup } from '../../maps_ems/public';
import { IServiceSettings } from '../../maps_ems/public';
import { DataPublicPluginStart } from '../../data/public';
import {
  setCoreService,
  setFormatService,
  setQueryService,
  setKibanaLegacy,
  setShareService,
} from './services';
import { KibanaLegacyStart } from '../../kibana_legacy/public';
import { SharePluginStart } from '../../share/public';

import { createTileMapFn } from './tile_map_fn';
import { createTileMapTypeDefinition } from './tile_map_type';
import { getTileMapRenderer } from './tile_map_renderer';

/** @private */
export interface TileMapVisualizationDependencies {
  uiSettings: IUiSettingsClient;
  getZoomPrecision: any;
  getPrecision: any;
  BaseMapsVisualization: any;
  getServiceSettings: () => Promise<IServiceSettings>;
}

/** @internal */
export interface TileMapPluginSetupDependencies {
  expressions: ReturnType<ExpressionsPublicPlugin['setup']>;
  visualizations: VisualizationsSetup;
  mapsLegacy: MapsLegacyPluginSetup;
  mapsEms: MapsEmsPluginSetup;
}

/** @internal */
export interface TileMapPluginStartDependencies {
  data: DataPublicPluginStart;
  kibanaLegacy: KibanaLegacyStart;
  share: SharePluginStart;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface TileMapPluginSetup {}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface TileMapPluginStart {}

/** @internal */
export class TileMapPlugin implements Plugin<TileMapPluginSetup, TileMapPluginStart> {
  initializerContext: PluginInitializerContext;

  constructor(initializerContext: PluginInitializerContext) {
    this.initializerContext = initializerContext;
  }

  public setup(
    core: CoreSetup,
    { expressions, visualizations, mapsLegacy, mapsEms }: TileMapPluginSetupDependencies
  ) {
    const { getZoomPrecision, getPrecision } = mapsLegacy;
    const visualizationDependencies: Readonly<TileMapVisualizationDependencies> = {
      getZoomPrecision,
      getPrecision,
      BaseMapsVisualization: mapsLegacy.getBaseMapsVis(),
      uiSettings: core.uiSettings,
      getServiceSettings: mapsEms.getServiceSettings,
    };

    expressions.registerFunction(createTileMapFn);
    expressions.registerRenderer(getTileMapRenderer(visualizationDependencies));

    visualizations.createBaseVisualization(createTileMapTypeDefinition(visualizationDependencies));

    return {};
  }

  public start(core: CoreStart, plugins: TileMapPluginStartDependencies) {
    setFormatService(plugins.data.fieldFormats);
    setQueryService(plugins.data.query);
    setKibanaLegacy(plugins.kibanaLegacy);
    setShareService(plugins.share);
    setCoreService(core);
    return {};
  }
}
