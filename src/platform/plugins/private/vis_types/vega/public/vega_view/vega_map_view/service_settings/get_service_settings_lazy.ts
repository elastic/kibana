/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IServiceSettings } from './service_settings_types';

let servicesPromise: Promise<IServiceSettings>;

export async function getServiceSettingsLazy(): Promise<IServiceSettings> {
  if (servicesPromise) {
    return await servicesPromise;
  }

  servicesPromise = new Promise(async (resolve, reject) => {
    try {
      const { getServiceSettings } = await import('../../../async_services');
      resolve(await getServiceSettings());
    } catch (error) {
      reject(error);
    }
  });

  return await servicesPromise;
}
