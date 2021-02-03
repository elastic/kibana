/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

let loadModulesPromise: Promise<LazyLoadedMapsLegacyModules>;

interface LazyLoadedMapsLegacyModules {
  KibanaMap: unknown;
  L: unknown;
  ServiceSettings: unknown;
}

export async function lazyLoadMapsLegacyModules(): Promise<LazyLoadedMapsLegacyModules> {
  if (typeof loadModulesPromise !== 'undefined') {
    return loadModulesPromise;
  }

  loadModulesPromise = new Promise(async (resolve) => {
    const { KibanaMap, L, ServiceSettings } = await import('./lazy');

    resolve({
      KibanaMap,
      L,
      ServiceSettings,
    });
  });
  return loadModulesPromise;
}
