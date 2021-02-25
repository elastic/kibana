/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IServiceSettings } from './service_settings_types';
import { getMapsEmsConfig } from '../kibana_services';
import { ServiceSettings } from './service_settings';

let loadPromise: Promise<IServiceSettings>;

export async function getServiceSettings(): Promise<IServiceSettings> {
  if (typeof loadPromise !== 'undefined') {
    return loadPromise;
  }

  loadPromise = new Promise(async (resolve) => {
    const config = getMapsEmsConfig();
    resolve(new ServiceSettings(config, config.tilemap));
  });
  return loadPromise;
}
