/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

// @ts-ignore
import { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from 'kibana/public';
// @ts-ignore
import { setToasts, setUiSettings, setKibanaVersion, setMapsLegacyConfig } from './kibana_services';
// @ts-ignore
import { getPrecision, getZoomPrecision } from './map/precision';
import { MapsLegacyPluginSetup, MapsLegacyPluginStart } from './index';
import { MapsLegacyConfig } from '../config';
// @ts-ignore
import { BaseMapsVisualizationProvider } from './map/base_maps_visualization';
import { getServiceSettings } from './get_service_settings';

/**
 * These are the interfaces with your public contracts. You should export these
 * for other plugins to use in _their_ `SetupDeps`/`StartDeps` interfaces.
 * @public
 */

export const bindSetupCoreAndPlugins = (
  core: CoreSetup,
  config: MapsLegacyConfig,
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
  readonly _initializerContext: PluginInitializerContext<MapsLegacyConfig>;

  constructor(initializerContext: PluginInitializerContext<MapsLegacyConfig>) {
    this._initializerContext = initializerContext;
  }

  public setup(core: CoreSetup, plugins: MapsLegacySetupDependencies) {
    const config = this._initializerContext.config.get<MapsLegacyConfig>();
    const kibanaVersion = this._initializerContext.env.packageInfo.version;

    bindSetupCoreAndPlugins(core, config, kibanaVersion);

    const getBaseMapsVis = () => new BaseMapsVisualizationProvider();

    return {
      getServiceSettings,
      getZoomPrecision,
      getPrecision,
      config,
      getBaseMapsVis,
    };
  }

  public start(core: CoreStart, plugins: MapsLegacyStartDependencies) {}
}
