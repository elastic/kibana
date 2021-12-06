/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from 'kibana/public';
import {
  setKibanaVersion,
  setLicensingPluginStart,
  setMapConfig,
  getIsEnterprisePlus,
} from './kibana_services';
import { MapsEmsPluginSetup, MapsEmsPluginStart } from './index';
import type { MapConfig } from '../config';
import { getServiceSettings } from './lazy_load_bundle/get_service_settings';
import { createEMSSettings } from '../common/ems_settings';
import {
  LicensingPluginSetup,
  LicensingPluginStart,
} from '../../../../x-pack/plugins/licensing/public';

/**
 * These are the interfaces with your public contracts. You should export these
 * for other plugins to use in _their_ `SetupDeps`/`StartDeps` interfaces.
 * @public
 */

export interface MapsEmsStartDependencies {
  licensing: LicensingPluginStart;
}
export interface MapsEmsSetupDependencies {
  licensing: LicensingPluginSetup;
}

export class MapsEmsPlugin implements Plugin<MapsEmsPluginSetup, MapsEmsPluginStart> {
  readonly _initializerContext: PluginInitializerContext<MapConfig>;

  constructor(initializerContext: PluginInitializerContext<MapConfig>) {
    this._initializerContext = initializerContext;
  }

  public setup(core: CoreSetup, plugins: MapsEmsSetupDependencies) {
    const mapConfig = this._initializerContext.config.get<MapConfig>();
    const kibanaVersion = this._initializerContext.env.packageInfo.version;

    setKibanaVersion(kibanaVersion);
    setMapConfig(mapConfig);

    return {
      config: mapConfig,
      getServiceSettings,
      createEMSSettings: () => {
        return createEMSSettings(mapConfig, getIsEnterprisePlus);
      },
    };
  }

  public start(core: CoreStart, plugins: MapsEmsStartDependencies) {
    setLicensingPluginStart(plugins.licensing);
  }
}
