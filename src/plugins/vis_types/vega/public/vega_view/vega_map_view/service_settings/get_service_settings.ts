/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { IServiceSettings } from '../service_settings/service_settings_types';
import { getMapsEms } from '../../../services';
import type { MapConfig } from '../../../../../../maps_ems/config';

let loadPromise: Promise<IServiceSettings>;

export async function getServiceSettings(): Promise<IServiceSettings> {
  if (typeof loadPromise !== 'undefined') {
    return loadPromise;
  }

  loadPromise = new Promise(async (resolve, reject) => {
    try {
      const { ServiceSettings } = await import('./service_settings');
      const mapsEmsConfig: MapConfig = getMapsEms().config;
      resolve(new ServiceSettings(mapsEmsConfig, mapsEmsConfig.tilemap));
    } catch (error) {
      reject(error);
    }
  });
  return loadPromise;
}
