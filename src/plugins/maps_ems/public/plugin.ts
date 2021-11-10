/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from 'kibana/public';
import { setKibanaVersion, setLicensingPluginStart, setMapsEmsConfig } from './kibana_services';
import { MapsEmsPluginSetup, MapsEmsPluginStart } from './index';
import type { MapsEmsConfig } from '../config';
import { getServiceSettings } from './lazy_load_bundle/get_service_settings';
import { EMSSettings } from '../common';
import { IEMSConfig } from '../common/ems_settings';
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
  readonly _initializerContext: PluginInitializerContext<MapsEmsConfig>;

  constructor(initializerContext: PluginInitializerContext<MapsEmsConfig>) {
    this._initializerContext = initializerContext;
  }

  public setup(core: CoreSetup, plugins: MapsEmsSetupDependencies) {
    const config = this._initializerContext.config.get<MapsEmsConfig>();
    const kibanaVersion = this._initializerContext.env.packageInfo.version;

    setKibanaVersion(kibanaVersion);
    setMapsEmsConfig(config);

    return {
      config,
      getServiceSettings,
      createEMSSettings: (emsConfig: IEMSConfig, getIsEnterPrisePlus: () => boolean) => {
        return new EMSSettings(emsConfig, getIsEnterPrisePlus);
      },
    };
  }

  public start(core: CoreStart, plugins: MapsEmsStartDependencies) {
    setLicensingPluginStart(plugins.licensing);
  }
}
