/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/public';
import {
  setKibanaVersion,
  setLicensingPluginStart,
  setMapConfig,
  getIsEnterprisePlus,
} from './kibana_services';
import type { MapsEmsPluginPublicSetup, MapsEmsPluginPublicStart } from '.';
import type { MapConfig } from '../config';
import { createEMSSettings } from '../common/ems_settings';
import { createEMSClientLazy } from './lazy_load_bundle';

interface MapsEmsStartPublicDependencies {
  licensing?: LicensingPluginStart;
}

export class MapsEmsPlugin implements Plugin<MapsEmsPluginPublicSetup, MapsEmsPluginPublicStart> {
  readonly _initializerContext: PluginInitializerContext<MapConfig>;

  constructor(initializerContext: PluginInitializerContext<MapConfig>) {
    this._initializerContext = initializerContext;
  }

  public setup() {
    return {};
  }

  public start(code: CoreStart, plugins: MapsEmsStartPublicDependencies) {
    const context = this._initializerContext;
    const mapConfig = context.config.get<MapConfig>();
    const { buildFlavor, version } = context.env.packageInfo;

    setKibanaVersion(version);
    setMapConfig(mapConfig);

    if (plugins.licensing) {
      setLicensingPluginStart(plugins.licensing);
    }
    return {
      config: mapConfig,
      createEMSSettings: () => {
        return createEMSSettings(mapConfig, getIsEnterprisePlus);
      },
      createEMSClient: async () => {
        const emsSettings = createEMSSettings(mapConfig, getIsEnterprisePlus);
        return createEMSClientLazy(emsSettings, version, buildFlavor);
      },
    };
  }
}
