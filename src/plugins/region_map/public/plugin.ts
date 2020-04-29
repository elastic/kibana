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
import { getBaseMapsVis, IServiceSettings, MapsLegacyPluginSetup } from '../../maps_legacy/public';
import { setFormatService, setNotifications } from './kibana_services';
import { DataPublicPluginStart } from '../../data/public';
import { RegionMapsConfigType } from './index';

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
  initializerContext: PluginInitializerContext;

  constructor(initializerContext: PluginInitializerContext) {
    this.initializerContext = initializerContext;
  }

  public async setup(
    core: CoreSetup,
    { expressions, visualizations, mapsLegacy }: RegionMapPluginSetupDependencies
  ) {
    const config = this.initializerContext.config.get<RegionMapsConfigType>();
    const visualizationDependencies: Readonly<RegionMapVisualizationDependencies> = {
      uiSettings: core.uiSettings,
      regionmapsConfig: config as RegionMapsConfig,
      serviceSettings: mapsLegacy.serviceSettings,
      BaseMapsVisualization: getBaseMapsVis(core, mapsLegacy.serviceSettings),
    };

    expressions.registerFunction(createRegionMapFn);

    visualizations.createBaseVisualization(
      createRegionMapTypeDefinition(visualizationDependencies)
    );

    return {
      config,
    };
  }

  public start(core: CoreStart, { data }: RegionMapPluginStartDependencies) {
    setFormatService(data.fieldFormats);
    setNotifications(core.notifications);
  }
}
