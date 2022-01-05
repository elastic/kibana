/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreSetup, Plugin, PluginInitializerContext } from 'kibana/public';
import {
  setKibanaVersion,
  setLicensingPluginSetup,
  setMapConfig,
  getIsEnterprisePlus,
} from './kibana_services';
import type { MapsEmsPluginPublicSetup, MapsEmsPluginPublicStart } from './index';
import type { MapConfig } from '../config';
import { createEMSSettings } from '../common/ems_settings';
import type { LicensingPluginSetup } from '../../../../x-pack/plugins/licensing/public';
import { createEMSClientLazy } from './lazy_load_bundle';

interface MapsEmsSetupPublicDependencies {
  licensing?: LicensingPluginSetup;
}

export class MapsEmsPlugin implements Plugin<MapsEmsPluginPublicSetup, MapsEmsPluginPublicStart> {
  readonly _initializerContext: PluginInitializerContext<MapConfig>;

  constructor(initializerContext: PluginInitializerContext<MapConfig>) {
    this._initializerContext = initializerContext;
  }

  public setup(core: CoreSetup, plugins: MapsEmsSetupPublicDependencies) {
    const mapConfig = this._initializerContext.config.get<MapConfig>();
    const kibanaVersion = this._initializerContext.env.packageInfo.version;

    setKibanaVersion(kibanaVersion);
    setMapConfig(mapConfig);

    if (plugins.licensing) {
      setLicensingPluginSetup(plugins.licensing);
    }

    return {
      config: mapConfig,
      createEMSSettings: () => {
        return createEMSSettings(mapConfig, getIsEnterprisePlus);
      },
      createEMSClient: async () => {
        const emsSettings = createEMSSettings(mapConfig, getIsEnterprisePlus);
        return createEMSClientLazy(emsSettings, kibanaVersion);
      },
    };
  }

  public start() {}
}
