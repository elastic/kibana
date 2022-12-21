/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { EMSClient } from '@elastic/ems-client';
import type { EMSSettings } from '../../common';

let lazyLoaded: (emsSettings: EMSSettings, version: string) => EMSClient;

export async function createEMSClientLazy(emsSettings: EMSSettings, version: string) {
  if (lazyLoaded) {
    return await lazyLoaded(emsSettings, version);
  }

  lazyLoaded = await new Promise(async (resolve, reject) => {
    try {
      try {
        const { createEMSClient } = await import('./create_ems_client');
        resolve(createEMSClient);
      } catch (error) {
        reject(error);
      }
    } catch (error) {
      reject(error);
    }
  });

  return await lazyLoaded(emsSettings, version);
}
