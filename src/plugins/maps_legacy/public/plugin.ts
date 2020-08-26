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

// @ts-ignore
import { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from 'kibana/public';
// @ts-ignore
import { setToasts, setUiSettings, setKibanaVersion, setMapsLegacyConfig } from './kibana_services';
// @ts-ignore
import { ServiceSettings } from './map/service_settings';
// @ts-ignore
import { getPrecision, getZoomPrecision } from './map/precision';
// @ts-ignore
import { KibanaMap } from './map/kibana_map';
import { MapsLegacyConfigType, MapsLegacyPluginSetup, MapsLegacyPluginStart } from './index';
import { ConfigSchema } from '../config';
// @ts-ignore
import { BaseMapsVisualizationProvider } from './map/base_maps_visualization';

/**
 * These are the interfaces with your public contracts. You should export these
 * for other plugins to use in _their_ `SetupDeps`/`StartDeps` interfaces.
 * @public
 */

export const bindSetupCoreAndPlugins = (
  core: CoreSetup,
  config: MapsLegacyConfigType,
  kibanaVersion: string
) => {
  setToasts(core.notifications.toasts);
  setUiSettings(core.uiSettings);
  setKibanaVersion(kibanaVersion);
  setMapsLegacyConfig(config);
};

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface MapsLegacySetupDependencies {}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface MapsLegacyStartDependencies {}

export class MapsLegacyPlugin implements Plugin<MapsLegacyPluginSetup, MapsLegacyPluginStart> {
  readonly _initializerContext: PluginInitializerContext<ConfigSchema>;

  constructor(initializerContext: PluginInitializerContext<ConfigSchema>) {
    this._initializerContext = initializerContext;
  }

  public setup(core: CoreSetup, plugins: MapsLegacySetupDependencies) {
    const config = this._initializerContext.config.get<MapsLegacyConfigType>();
    const kibanaVersion = this._initializerContext.env.packageInfo.version;

    bindSetupCoreAndPlugins(core, config, kibanaVersion);

    const serviceSettings = new ServiceSettings(config, config.tilemap);
    const getKibanaMapFactoryProvider = (...args: any) => new KibanaMap(...args);
    const getBaseMapsVis = () =>
      new BaseMapsVisualizationProvider(getKibanaMapFactoryProvider, serviceSettings);

    return {
      serviceSettings,
      getZoomPrecision,
      getPrecision,
      config,
      getKibanaMapFactoryProvider,
      getBaseMapsVis,
    };
  }

  public start(core: CoreStart, plugins: MapsLegacyStartDependencies) {}
}
