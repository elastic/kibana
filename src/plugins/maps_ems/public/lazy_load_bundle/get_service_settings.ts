/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { IServiceSettings } from '../service_settings/service_settings_types';
import { getMapsEmsConfig } from '../kibana_services';

let loadPromise: Promise<IServiceSettings>;

export async function getServiceSettings(): Promise<IServiceSettings> {
  if (typeof loadPromise !== 'undefined') {
    return loadPromise;
  }

  loadPromise = new Promise(async (resolve, reject) => {
    try {
      const { ServiceSettings } = await import('./lazy');
      const config = getMapsEmsConfig();
      resolve(new ServiceSettings(config, config.tilemap));
    } catch (error) {
      reject(error);
    }
  });
  return loadPromise;
}
