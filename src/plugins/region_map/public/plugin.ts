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
  NotificationsStart,
} from 'kibana/public';
import { Plugin as ExpressionsPublicPlugin } from 'src/plugins/expressions/public';
import { VisualizationsSetup } from 'src/plugins/visualizations/public';
// @ts-ignore
// @ts-ignore
import { IServiceSettings, MapsLegacyPluginSetup } from 'src/plugins/maps_legacy/public';
import { DataPublicPluginStart } from 'src/plugins/data/public';
import { MapsLegacyConfig } from 'src/plugins/maps_legacy/config';
import { KibanaLegacyStart } from 'src/plugins/kibana_legacy/public';
import { SharePluginStart } from 'src/plugins/share/public';
import { RegionMapsConfigType } from './index';
import {
  setCoreService,
  setFormatService,
  setNotifications,
  setKibanaLegacy,
  setQueryService,
  setShareService,
} from './kibana_services';
import { createRegionMapTypeDefinition } from './region_map_type';
import { createRegionMapFn } from './region_map_fn';
import { getRegionMapRenderer } from './region_map_renderer';

/** @private */
export interface RegionMapVisualizationDependencies {
  uiSettings: IUiSettingsClient;
  regionmapsConfig: RegionMapsConfig;
  getServiceSettings: () => Promise<IServiceSettings>;
  BaseMapsVisualization: any;
}

/** @internal */
export interface RegionMapPluginSetupDependencies {
  expressions: ReturnType<ExpressionsPublicPlugin['setup']>;
  visualizations: VisualizationsSetup;
  mapsLegacy: MapsLegacyPluginSetup;
}

/** @internal */
export interface RegionMapPluginStartDependencies {
  data: DataPublicPluginStart;
  notifications: NotificationsStart;
  kibanaLegacy: KibanaLegacyStart;
  share: SharePluginStart;
}

/** @internal */
export interface RegionMapsConfig {
  includeElasticMapsService: boolean;
  layers: any[];
}

export interface RegionMapPluginSetup {
  config: any;
}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface RegionMapPluginStart {}

/** @internal */
export class RegionMapPlugin implements Plugin<RegionMapPluginSetup, RegionMapPluginStart> {
  readonly _initializerContext: PluginInitializerContext<MapsLegacyConfig>;

  constructor(initializerContext: PluginInitializerContext) {
    this._initializerContext = initializerContext;
  }

  public setup(
    core: CoreSetup,
    { expressions, visualizations, mapsLegacy }: RegionMapPluginSetupDependencies
  ) {
    const config = {
      ...this._initializerContext.config.get<RegionMapsConfigType>(),
      // The maps legacy plugin updates the regionmap config directly in service_settings,
      // future work on how configurations across the different plugins are organized would
      // ideally constrain regionmap config updates to occur only from this plugin
      ...mapsLegacy.config.regionmap,
    };
    const visualizationDependencies: Readonly<RegionMapVisualizationDependencies> = {
      uiSettings: core.uiSettings,
      regionmapsConfig: config as RegionMapsConfig,
      getServiceSettings: mapsLegacy.getServiceSettings,
      BaseMapsVisualization: mapsLegacy.getBaseMapsVis(),
    };

    expressions.registerFunction(createRegionMapFn);
    expressions.registerRenderer(getRegionMapRenderer(visualizationDependencies));

    visualizations.createBaseVisualization(
      createRegionMapTypeDefinition(visualizationDependencies)
    );

    return {
      config,
    };
  }

  public start(core: CoreStart, plugins: RegionMapPluginStartDependencies) {
    setCoreService(core);
    setFormatService(plugins.data.fieldFormats);
    setQueryService(plugins.data.query);
    setNotifications(core.notifications);
    setKibanaLegacy(plugins.kibanaLegacy);
    setShareService(plugins.share);
    return {};
  }
}
