/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ILicense, LicensingPluginStart } from '@kbn/licensing-plugin/server';
import type { Plugin, PluginInitializerContext } from '@kbn/core-plugins-server';
import type { CoreSetup } from '@kbn/core-lifecycle-server';
import type { MapConfig } from './config';
import { LICENSE_CHECK_ID, EMSSettings } from '../common';

export interface MapsEmsPluginServerSetup {
  config: MapConfig;
  createEMSSettings: () => EMSSettings;
}

interface MapsEmsStartServerDependencies {
  licensing?: LicensingPluginStart;
}

export class MapsEmsPlugin implements Plugin<MapsEmsPluginServerSetup> {
  readonly _initializerContext: PluginInitializerContext<MapConfig>;

  constructor(initializerContext: PluginInitializerContext<MapConfig>) {
    this._initializerContext = initializerContext;
  }

  public setup(core: CoreSetup<MapsEmsStartServerDependencies>) {
    const mapConfig = this._initializerContext.config.get();

    let isEnterprisePlus = false;
    function updateLicenseState(license: ILicense) {
      const enterprise = license.check(LICENSE_CHECK_ID, 'enterprise');
      isEnterprisePlus = enterprise.state === 'valid';
    }
    core
      .getStartServices()
      .then(([_, { licensing }]) => {
        licensing?.license$.subscribe(updateLicenseState);
      })
      .catch(() => {});

    return {
      config: mapConfig,
      createEMSSettings: () => {
        return new EMSSettings(mapConfig, () => {
          return isEnterprisePlus;
        });
      },
    };
  }

  public start() {}
}
