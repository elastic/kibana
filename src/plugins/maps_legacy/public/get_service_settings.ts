/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { lazyLoadMapsLegacyModules } from './lazy_load_bundle';
// @ts-expect-error
import { getMapsLegacyConfig } from './kibana_services';
import { IServiceSettings } from './map/service_settings_types';

let loadPromise: Promise<IServiceSettings>;

export async function getServiceSettings(): Promise<IServiceSettings> {
  if (typeof loadPromise !== 'undefined') {
    return loadPromise;
  }

  loadPromise = new Promise(async (resolve) => {
    const modules = await lazyLoadMapsLegacyModules();
    const config = getMapsLegacyConfig();
    // @ts-expect-error
    resolve(new modules.ServiceSettings(config, config.tilemap));
  });
  return loadPromise;
}
