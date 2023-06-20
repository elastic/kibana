/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  AppMountParameters,
  CoreSetup,
  CoreStart,
  Plugin,
  PluginInitializerContext,
} from '@kbn/core/public';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/public';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
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
import { APP_ID, APP_NAME } from '../common/ems_defaults';

interface MapsEmsSetupPublicDependencies {
  usageCollection?: UsageCollectionSetup;
}
interface MapsEmsStartPublicDependencies {
  licensing?: LicensingPluginStart;
}

export class MapsEmsPlugin implements Plugin<MapsEmsPluginPublicSetup, MapsEmsPluginPublicStart> {
  readonly _initializerContext: PluginInitializerContext<MapConfig>;

  constructor(initializerContext: PluginInitializerContext<MapConfig>) {
    this._initializerContext = initializerContext;
  }

  public setup(core: CoreSetup, plugins: MapsEmsSetupPublicDependencies) {
    const { usageCollection } = plugins;
    core.application.register({
      id: APP_ID,
      title: APP_NAME,
      navLinkStatus: 0, // TODO set to 3 to hide it from the nav menu
      async mount(appMountParameters: AppMountParameters) {
        const { renderApp } = await import('./application');
        const [coreStart] = await core.getStartServices();
        return renderApp({ coreStart, usageCollection, appMountParameters });
      },
    });
    return {};
  }

  public start(core: CoreStart, plugins: MapsEmsStartPublicDependencies) {
    const mapConfig = this._initializerContext.config.get<MapConfig>();
    const kibanaVersion = this._initializerContext.env.packageInfo.version;

    setKibanaVersion(kibanaVersion);
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
        return createEMSClientLazy(emsSettings, kibanaVersion);
      },
    };
  }
}
