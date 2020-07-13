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
  NotificationsStart,
} from 'kibana/public';
import { Plugin as ExpressionsPublicPlugin } from '../../expressions/public';
import { VisualizationsSetup } from '../../visualizations/public';
// @ts-ignore
import { createRegionMapFn } from './region_map_fn';
// @ts-ignore
import { createRegionMapTypeDefinition } from './region_map_type';
import { IServiceSettings, MapsLegacyPluginSetup } from '../../maps_legacy/public';
import { setFormatService, setNotifications, setKibanaLegacy } from './kibana_services';
import { DataPublicPluginStart } from '../../data/public';
import { RegionMapsConfigType } from './index';
import { ConfigSchema } from '../../maps_legacy/config';
import { KibanaLegacyStart } from '../../kibana_legacy/public';

/** @private */
interface RegionMapVisualizationDependencies {
  uiSettings: IUiSettingsClient;
  regionmapsConfig: RegionMapsConfig;
  serviceSettings: IServiceSettings;
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
  readonly _initializerContext: PluginInitializerContext<ConfigSchema>;

  constructor(initializerContext: PluginInitializerContext) {
    this._initializerContext = initializerContext;
  }

  public async setup(
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
      serviceSettings: mapsLegacy.serviceSettings,
      BaseMapsVisualization: mapsLegacy.getBaseMapsVis(),
    };

    expressions.registerFunction(createRegionMapFn);

    visualizations.createBaseVisualization(
      createRegionMapTypeDefinition(visualizationDependencies)
    );

    return {
      config,
    };
  }

  // @ts-ignore
  public start(core: CoreStart, { data, kibanaLegacy }: RegionMapPluginStartDependencies) {
    setFormatService(data.fieldFormats);
    setNotifications(core.notifications);
    setKibanaLegacy(kibanaLegacy);
  }
}
