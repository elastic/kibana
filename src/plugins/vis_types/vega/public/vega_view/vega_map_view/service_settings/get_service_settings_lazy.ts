/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { IServiceSettings } from './service_settings_types';

let lazyLoaded: () => Promise<IServiceSettings>;

export async function getServiceSettingsLazy(): Promise<IServiceSettings> {
  if (lazyLoaded) {
    return await lazyLoaded();
  }

  lazyLoaded = await new Promise(async (resolve, reject) => {
    try {
      try {
        const { getServiceSettings } = await import('./get_service_settings');
        resolve(getServiceSettings);
      } catch (error) {
        reject(error);
      }
    } catch (error) {
      reject(error);
    }
  });

  return await lazyLoaded();
}
