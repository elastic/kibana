/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { IEMSKbnMapsSettings } from '../service_settings/service_settings_types';
import { getMapConfig } from '../kibana_services';

let loadPromise: Promise<IEMSKbnMapsSettings>;

export async function getServiceSettings(): Promise<IEMSKbnMapsSettings> {
  if (typeof loadPromise !== 'undefined') {
    return loadPromise;
  }

  loadPromise = new Promise(async (resolve, reject) => {
    try {
      const { KbnMapsSettings } = await import('./lazy');
      const mapsEmsConfig = getMapConfig();
      resolve(new KbnMapsSettings(mapsEmsConfig, mapsEmsConfig.tilemap));
    } catch (error) {
      reject(error);
    }
  });
  return loadPromise;
}
